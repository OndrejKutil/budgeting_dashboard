import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mock data
const mockTransactions = [
  { id: '1', date: '2026-01-08', description: 'Grocery Store', category: 'Food', account: 'Checking', amount: -85.42 },
  { id: '2', date: '2026-01-07', description: 'Salary Deposit', category: 'Income', account: 'Checking', amount: 4500.00 },
  { id: '3', date: '2026-01-06', description: 'Electric Bill', category: 'Utilities', account: 'Checking', amount: -125.00 },
  { id: '4', date: '2026-01-05', description: 'Coffee Shop', category: 'Food', account: 'Credit Card', amount: -12.50 },
  { id: '5', date: '2026-01-04', description: 'Netflix', category: 'Entertainment', account: 'Credit Card', amount: -15.99 },
  { id: '6', date: '2026-01-03', description: 'Gas Station', category: 'Transport', account: 'Credit Card', amount: -48.00 },
  { id: '7', date: '2026-01-02', description: 'Investment Transfer', category: 'Investment', account: 'Brokerage', amount: -500.00 },
  { id: '8', date: '2026-01-01', description: 'Rent Payment', category: 'Housing', account: 'Checking', amount: -1800.00 },
];

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<typeof mockTransactions[0] | null>(null);

  const filteredTransactions = mockTransactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(mockTransactions.map((t) => t.category))];

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
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
        {filteredTransactions.length === 0 ? (
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
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="group">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {transaction.category}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {transaction.account}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium font-mono',
                        transaction.amount > 0 ? 'text-success' : 'text-foreground'
                      )}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      ${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                          <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {mockTransactions.length} transactions
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
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
          setIsCreateModalOpen(false);
          setSelectedTransaction(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery Store"
                defaultValue={selectedTransaction?.description}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  defaultValue={selectedTransaction ? Math.abs(selectedTransaction.amount) : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  defaultValue={selectedTransaction?.date || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select defaultValue={selectedTransaction?.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              setSelectedTransaction(null);
            }}>
              Cancel
            </Button>
            <Button className="bg-gradient-blurple hover:opacity-90">
              {selectedTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
