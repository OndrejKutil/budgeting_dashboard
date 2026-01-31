import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { transactionsApi, categoriesApi, accountsApi, fundsApi, ApiError } from '@/lib/api/client';
import { Transaction, Category, Account, SavingsFund, CreateTransactionRequest, UpdateTransactionRequest } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { useDebounce } from '@/hooks/use-debounce';

const ITEMS_PER_PAGE: number = 20;



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
  const queryClient = useQueryClient();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  // URL State Management
  const [page, setPage] = useUrlState<number>('page', 1);
  const [searchQuery, setSearchQuery] = useUrlState<string>('q', '');
  const [categoryFilter, setCategoryFilter] = useUrlState<string>('category', 'all');
  const [accountFilter, setAccountFilter] = useUrlState<string>('account', 'all');
  const [fundFilter, setFundFilter] = useUrlState<string>('fund', 'all');
  const [typeFilter, setTypeFilter] = useUrlState<string>('type', 'all');
  const [minAmount, setMinAmount] = useUrlState<string>('min', '');
  const [maxAmount, setMaxAmount] = useUrlState<string>('max', '');
  const [yearFilter, setYearFilter] = useUrlState<string>('year', new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useUrlState<string>('month', 'all');

  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedMin = useDebounce(minAmount, 500);
  const debouncedMax = useDebounce(maxAmount, 500);

  const clearFilters = () => {
    const prefix = `budget-dashboard:${location.pathname}`;
    const keys = ['q', 'category', 'account', 'fund', 'type', 'min', 'max', 'year', 'month'];
    keys.forEach(k => sessionStorage.removeItem(`${prefix}:${k}`));
    setSearchParams(new URLSearchParams());
  };

  // Derived state
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.getAll();
      return res.data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await accountsApi.getAll();
      return res.data || [];
    },
  });

  const { data: funds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => {
      const res = await fundsApi.getAll();
      return res.data || [];
    },
  });

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    error: transactionsError
  } = useQuery({
    queryKey: ['transactions', {
      page,
      search: debouncedSearch,
      category: categoryFilter,
      account: accountFilter,
      fund: fundFilter,
      type: typeFilter,
      min: debouncedMin,
      max: debouncedMax,
      year: yearFilter,
      month: monthFilter
    }],
    queryFn: () => transactionsApi.getAll({
      limit: ITEMS_PER_PAGE,
      offset,
      search: debouncedSearch || undefined,
      category_id: categoryFilter === 'all' ? undefined : categoryFilter,
      account_id: accountFilter === 'all' ? undefined : accountFilter,
      savings_fund_id: fundFilter === 'all' ? undefined : fundFilter,
      category_type: typeFilter === 'all' ? undefined : typeFilter,
      min_amount: debouncedMin ? parseFloat(debouncedMin) : undefined,
      max_amount: debouncedMax ? parseFloat(debouncedMax) : undefined,
      start_date: monthFilter === 'all'
        ? `${yearFilter}-01-01`
        : `${yearFilter}-${monthFilter.padStart(2, '0')}-01`,
      end_date: monthFilter === 'all'
        ? `${yearFilter}-12-31`
        : `${yearFilter}-${monthFilter.padStart(2, '0')}-${new Date(parseInt(yearFilter), parseInt(monthFilter), 0).getDate()}`,
    }),
    placeholderData: keepPreviousData,
  });

  const transactions = transactionsData?.data || [];
  const totalCount = transactionsData?.count || 0;
  const isLoading = isTransactionsLoading;
  const error = transactionsError ? (transactionsError as Error).message : null;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');

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



  // Generate years for filter (current year + 3 years)
  // TODO: Get years from API
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, i) => (currentYear - i + 2).toString());
  }, []);



  // Reset page when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [categoryFilter, yearFilter, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // Also invalidate summary/analytics if needed
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been removed successfully.',
      });
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to delete transaction';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const handleDelete = (transactionId: string) => {
    deleteMutation.mutate(transactionId);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateTransactionRequest) => transactionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      toast({ title: 'Transaction created successfully' });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to save transaction';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionRequest }) => transactionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      toast({ title: 'Transaction updated successfully' });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to save transaction';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async () => {
    if (isTransfer) {
      if (!formData.account_id_fk || !transferToAccountId || !formData.amount) {
        toast({
          title: 'Validation Error',
          description: 'Please select both accounts and enter an amount.',
          variant: 'destructive',
        });
        return;
      }

      // Find 'Exclude' category
      const excludeCategory = categories.find(c => c.category_name === 'Exclude');
      if (!excludeCategory) {
        toast({
          title: 'Configuration Error',
          description: 'The "Exclude" category is required for transfers but was not found.',
          variant: 'destructive',
        });
        return;
      }

      const amount = parseFloat(formData.amount);
      const categoryId = excludeCategory.categories_id_pk;

      // 1. Outgoing Transaction (Negative)
      const outgoingPayload = {
        account_id_fk: formData.account_id_fk,
        category_id_fk: categoryId,
        amount: -Math.abs(amount),
        date: formData.date,
        notes: `Transfer to ${accountMap[transferToAccountId]?.account_name || 'Account'}: ${formData.notes || ''}`,
        savings_fund_id_fk: null,
      };

      // 2. Incoming Transaction (Positive)
      const incomingPayload = {
        account_id_fk: transferToAccountId,
        category_id_fk: categoryId,
        amount: Math.abs(amount),
        date: formData.date,
        notes: `Transfer from ${accountMap[formData.account_id_fk]?.account_name || 'Account'}: ${formData.notes || ''}`,
        savings_fund_id_fk: null,
      };

      try {
        await transactionsApi.create(outgoingPayload);
        await transactionsApi.create(incomingPayload);

        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['summary'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Update account balances

        toast({ title: 'Transfer completed successfully' });
        closeModal();
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to complete transfer';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
      return;
    }

    if (!formData.account_id_fk || !formData.category_id_fk || !formData.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      account_id_fk: formData.account_id_fk,
      category_id_fk: parseInt(formData.category_id_fk),
      amount: parseFloat(formData.amount),
      date: formData.date,
      notes: formData.notes || null,
      savings_fund_id_fk: formData.savings_fund_id_fk || null,
    };

    if (selectedTransaction) {
      updateMutation.mutate({ id: selectedTransaction.id_pk, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);

    // Check if this is a withdrawal transaction
    const category = categoryMap[transaction.category_id_fk];
    const isWithdrawalTx = category?.category_name === 'Savings Funds Withdrawal';
    setIsWithdrawal(isWithdrawalTx);
    setIsTransfer(false); // Edit mode doesn't support converting to transfer easily yet
    setTransferToAccountId('');

    setFormData({
      amount: transaction.amount.toString(),
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
    setSelectedTransaction(null);
    setIsWithdrawal(false);
    setIsTransfer(false);
    setTransferToAccountId('');
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

      {/* Filters Control Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-input/50 focus:bg-background transition-colors"
            />
          </div>
          {(categoryFilter !== 'all' || accountFilter !== 'all' || fundFilter !== 'all' || typeFilter !== 'all' || monthFilter !== 'all' || minAmount || maxAmount || searchQuery) && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="saving">Saving</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.categories_id_pk} value={c.categories_id_pk.toString()}>{c.category_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(a => <SelectItem key={a.accounts_id_pk} value={a.accounts_id_pk}>{a.account_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={fundFilter} onValueChange={setFundFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder="Savings Fund" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funds</SelectItem>
              <SelectItem value="none">Not Assigned</SelectItem>
              {funds.map(f => <SelectItem key={f.savings_funds_id_pk} value={f.savings_funds_id_pk}>{f.fund_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input
            placeholder="Min Amount"
            type="number"
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
            className="bg-background/50 border-input/50"
          />

          <Input
            placeholder="Max Amount"
            type="number"
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
            className="bg-background/50 border-input/50"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32 pl-6">Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="hidden lg:table-cell">Fund</TableHead>
                <TableHead className="text-right pr-6">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        ) : transactions.length === 0 ? (
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
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="w-32 pl-6 font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Account</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Fund</TableHead>
                  <TableHead className="text-right pr-6 font-semibold">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const category = categoryMap[transaction.category_id_fk];
                  const account = accountMap[transaction.account_id_fk];
                  const fund = transaction.savings_fund_id_fk ? fundMap[transaction.savings_fund_id_fk] : null;
                  return (
                    <TableRow key={transaction.id_pk} className="group hover:bg-muted/40 border-b border-border/40 last:border-0 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm text-foreground">{transaction.notes || '-'}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", category?.type === 'income' ? "bg-success/50" : "bg-primary/30")} />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {category?.category_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {account?.account_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {fund ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-chart-investment/50" />
                            <span>{fund.fund_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {/* Indicator Dot */}
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            transaction.amount > 0 ? "bg-emerald-500" : "bg-rose-500"
                          )} />
                          {/* Neutral Text */}
                          <span className="font-mono font-medium text-foreground">
                            {transaction.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{offset + 1}</span>-
                <span className="font-medium text-foreground">{Math.min(offset + ITEMS_PER_PAGE, totalCount)}</span> of{' '}
                <span className="font-medium text-foreground">{totalCount}</span> transactions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  className="hidden sm:flex h-8 bg-background/50"
                >
                  Newest
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className="h-8 bg-background/50"
                  >
                    <ChevronLeft className="mr-1 h-3 w-3" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 bg-background/50"
                  >
                    Next
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
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
                  step="10.00"
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
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="withdrawal"
                checked={isWithdrawal}
                onCheckedChange={(checked) => {
                  setIsWithdrawal(checked === true);
                  if (checked === true) {
                    const withdrawalCat = categories.find(c => c.category_name === 'Savings Funds Withdrawal');
                    if (withdrawalCat) {
                      setFormData(prev => ({ ...prev, category_id_fk: withdrawalCat.categories_id_pk.toString() }));
                    } else {
                      console.warn('Savings Funds Withdrawal category not found');
                    }
                  } else {
                    setFormData(prev => ({ ...prev, category_id_fk: '' }));
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="withdrawal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Withdrawal from Fund
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Check this when you are taking money OUT of a savings fund. It will be recorded as income.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="transfer"
                checked={isTransfer}
                disabled={!!selectedTransaction}
                onCheckedChange={(checked) => {
                  setIsTransfer(checked === true);
                  if (checked === true) {
                    setIsWithdrawal(false);
                    // Clear category as it will be auto-set
                    setFormData(prev => ({ ...prev, category_id_fk: '' }));
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="transfer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Transfer between Accounts
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Move money between accounts. This will create two transactions using the 'Exclude' category.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {!isWithdrawal && !isTransfer && (
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
            )}
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

            {isTransfer && (
              <div className="space-y-2">
                <Label htmlFor="to-account">To Account</Label>
                <Select
                  value={transferToAccountId}
                  onValueChange={setTransferToAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(acc => acc.accounts_id_pk !== formData.account_id_fk)
                      .map((acc) => (
                        <SelectItem key={acc.accounts_id_pk} value={acc.accounts_id_pk}>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isTransfer && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="fund">Savings Fund {isWithdrawal ? '' : '(Optional)'}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">To allocate money to a fund: Select a 'Saving' category (e.g., 'Emergency Fund') and then select the corresponding Fund here.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
            )}
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
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
