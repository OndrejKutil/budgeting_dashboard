import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { transactionsApi, categoriesApi, accountsApi, fundsApi, ApiError } from '@/lib/api/client';
import { Transaction, Category, Account, SavingsFund } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

const ITEMS_PER_PAGE = 20;

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );
}

export default function TransactionsPage() {
  const { formatCurrency } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [funds, setFunds] = useState<SavingsFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    category_id_fk: '',
    account_id_fk: '',
    savings_fund_id_fk: '',
  });

  // Create lookup maps for categories and accounts
  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.categories_id_pk] = cat;
      return acc;
    }, {} as Record<number, Category>);
  }, [categories]);

  const accountMap = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.accounts_id_pk] = account;
      return acc;
    }, {} as Record<string, Account>);
  }, [accounts]);

  const fundMap = useMemo(() => {
    return funds.reduce((acc, fund) => {
      acc[fund.savings_funds_id_pk] = fund;
      return acc;
    }, {} as Record<string, SavingsFund>);
  }, [funds]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const [transactionsRes, categoriesRes, accountsRes, fundsRes] = await Promise.all([
          transactionsApi.getAll({ limit: ITEMS_PER_PAGE, offset: currentPage * ITEMS_PER_PAGE }),
          categoriesApi.getAll(),
          accountsApi.getAll(),
          fundsApi.getAll(),
        ]);

        setTransactions(transactionsRes.data);
        setTotalCount(transactionsRes.count);
        setCategories(categoriesRes.data);
        setAccounts(accountsRes.data);
        setFunds(fundsRes.data);
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : 'Failed to load transactions';
        setError(message || 'Failed to load transactions');
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [currentPage]);

  // Filter transactions locally
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const category = categoryMap[t.category_id_fk];
      const matchesSearch = t.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category?.category_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category_id_fk.toString() === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, categoryFilter, categoryMap]);

  const handleDelete = async (transactionId: string) => {
    try {
      await transactionsApi.delete(transactionId);
      setTransactions(transactions.filter(t => t.id_pk !== transactionId));
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been removed successfully.',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to delete transaction';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.account_id_fk || !formData.category_id_fk || !formData.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        account_id_fk: formData.account_id_fk,
        category_id_fk: parseInt(formData.category_id_fk),
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes || null,
        savings_fund_id_fk: formData.savings_fund_id_fk || null,
      };

      if (selectedTransaction) {
        const result = await transactionsApi.update(selectedTransaction.id_pk, payload);
        if (result.data && result.data[0]) {
          setTransactions(transactions.map(t =>
            t.id_pk === selectedTransaction.id_pk ? result.data[0] : t
          ));
        }
        toast({ title: 'Transaction updated successfully' });
      } else {
        const result = await transactionsApi.create(payload);
        if (result.data && result.data[0]) {
          setTransactions([result.data[0], ...transactions]);
        }
        toast({ title: 'Transaction created successfully' });
      }

      setIsCreateModalOpen(false);
      setSelectedTransaction(null);
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        category_id_fk: '',
        account_id_fk: '',
        savings_fund_id_fk: '',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to save transaction';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      amount: Math.abs(transaction.amount).toString(),
      date: transaction.date,
      notes: transaction.notes || '',
      category_id_fk: transaction.category_id_fk.toString(),
      account_id_fk: transaction.account_id_fk,
      savings_fund_id_fk: transaction.savings_fund_id_fk || '',
    });
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setSelectedTransaction(null);
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      category_id_fk: '',
      account_id_fk: '',
      savings_fund_id_fk: '',
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (error && !isLoading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Transactions"
          description="View and manage all your financial transactions"
          actions={
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-blurple hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">Failed to load transactions</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="View and manage all your financial transactions"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-blurple hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        }
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.categories_id_pk} value={cat.categories_id_pk.toString()}>
                {cat.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-card"
      >
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="hidden lg:table-cell">Fund</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
            title="No transactions found"
            description="Try adjusting your filters or add a new transaction"
            action={{
              label: 'Add Transaction',
              onClick: () => setIsCreateModalOpen(true),
            }}
            className="m-6 border-0 bg-transparent"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Account</TableHead>
                  <TableHead className="hidden lg:table-cell">Fund</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const category = categoryMap[transaction.category_id_fk];
                  const account = accountMap[transaction.account_id_fk];
                  const fund = transaction.savings_fund_id_fk ? fundMap[transaction.savings_fund_id_fk] : null;
                  return (
                    <TableRow key={transaction.id_pk} className="group">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{transaction.notes || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {category?.category_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {account?.account_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {fund ? (
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs">
                            {fund.fund_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium font-mono',
                          transaction.amount > 0 ? 'text-success' : 'text-foreground'
                        )}
                      >
                        {transaction.amount > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(transaction)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(transaction.id_pk)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {totalCount} transactions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || !!selectedTransaction} onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {selectedTransaction ? 'Make changes to your transaction details below.' : 'Add a new transaction to your records.'}
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="e.g., Grocery Store"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id_fk}
                onValueChange={(value) => setFormData({ ...formData, category_id_fk: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.categories_id_pk} value={cat.categories_id_pk.toString()}>
                      {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select
                value={formData.account_id_fk}
                onValueChange={(value) => setFormData({ ...formData, account_id_fk: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.accounts_id_pk} value={acc.accounts_id_pk}>
                      {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fund">Savings Fund (Optional)</Label>
              <Select
                value={formData.savings_fund_id_fk || 'none'}
                onValueChange={(value) => setFormData({ ...formData, savings_fund_id_fk: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {funds.map((fund) => (
                    <SelectItem key={fund.savings_funds_id_pk} value={fund.savings_funds_id_pk}>
                      {fund.fund_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-blurple hover:opacity-90"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
