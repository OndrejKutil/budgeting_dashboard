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
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ApiError } from '@/lib/api/client';
import { transactionsApi, categoriesApi, accountsApi, fundsApi } from '@/lib/api/endpoints';
import { Transaction, Category, Account, SavingsFund, CreateTransactionRequest, UpdateTransactionRequest } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { useDebounce } from '@/hooks/use-debounce';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

const ITEMS_PER_PAGE: number = 20;
const DECIMAL_INPUT_PATTERN = "-?[0-9]*([.,][0-9]*)?";

function parseDecimalInput(value: string): number | null {
  const compactValue = value.trim().replace(/\s/g, '');
  if (!compactValue) return null;

  const lastComma = compactValue.lastIndexOf(',');
  const lastDot = compactValue.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : lastDot >= 0 ? '.' : '';

  let normalizedValue = compactValue;
  if (decimalSeparator) {
    const decimalIndex = decimalSeparator === ',' ? lastComma : lastDot;
    const integerPart = compactValue.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = compactValue.slice(decimalIndex + 1).replace(/[.,]/g, '');
    normalizedValue = `${integerPart}.${decimalPart}`;
  }

  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalizedValue)) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

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
  const { formatCurrency, formatDate, formatMonth, formatNumber, t } = useUser();
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
      min_amount: parseDecimalInput(debouncedMin) ?? undefined,
      max_amount: parseDecimalInput(debouncedMax) ?? undefined,
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
  const rangeStart = transactions.length === 0 ? 0 : offset + 1;
  const rangeEnd = transactions.length === 0 ? 0 : offset + transactions.length;
  const hasNextPage = transactions.length === ITEMS_PER_PAGE;
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
        title: t('pages.transactions.deleted'),
        description: t('pages.transactions.deletedDescription'),
      });
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : t('pages.transactions.deleteFailed');
      toast({
        title: t('common.error'),
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
      toast({ title: t('pages.transactions.created') });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : t('pages.transactions.saveFailed');
      toast({
        title: t('common.error'),
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
      toast({ title: t('pages.transactions.updated') });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : t('pages.transactions.saveFailed');
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async () => {
    if (isTransfer) {
      const amount = parseDecimalInput(formData.amount);

      if (!formData.account_id_fk || !transferToAccountId || amount === null) {
        toast({
          title: t('common.validationError'),
          description: t('pages.transactions.transferValidation'),
          variant: 'destructive',
        });
        return;
      }

      // Find 'Exclude' category
      const excludeCategory = categories.find(c => c.category_name === 'Exclude');
      if (!excludeCategory) {
        toast({
          title: t('pages.transactions.configurationError'),
          description: t('pages.transactions.excludeMissing'),
          variant: 'destructive',
        });
        return;
      }

      const categoryId = excludeCategory.categories_id_pk;

      // 1. Outgoing Transaction (Negative)
      const outgoingPayload = {
        account_id_fk: formData.account_id_fk,
        category_id_fk: categoryId,
        amount: -Math.abs(amount),
        date: formData.date,
        notes: t('pages.transactions.transferTo', { account: accountMap[transferToAccountId]?.account_name || t('common.account'), notes: formData.notes || '' }),
        savings_fund_id_fk: null,
      };

      // 2. Incoming Transaction (Positive)
      const incomingPayload = {
        account_id_fk: transferToAccountId,
        category_id_fk: categoryId,
        amount: Math.abs(amount),
        date: formData.date,
        notes: t('pages.transactions.transferFrom', { account: accountMap[formData.account_id_fk]?.account_name || t('common.account'), notes: formData.notes || '' }),
        savings_fund_id_fk: null,
      };

      try {
        await transactionsApi.create(outgoingPayload);
        await transactionsApi.create(incomingPayload);

        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['summary'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Update account balances

        toast({ title: t('pages.transactions.transferCompleted') });
        closeModal();
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : t('pages.transactions.transferFailed');
        toast({
          title: t('common.error'),
          description: message,
          variant: 'destructive',
        });
      }
      return;
    }

    const amount = parseDecimalInput(formData.amount);

    if (!formData.account_id_fk || !formData.category_id_fk || amount === null) {
      toast({
        title: t('common.validationError'),
        description: t('common.requiredFields'),
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      account_id_fk: formData.account_id_fk,
      category_id_fk: parseInt(formData.category_id_fk),
      amount,
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

  if (error && !isLoading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('pages.transactions.title')}
          description={t('pages.transactions.description')}
          actions={
            <Button onClick={() => setIsCreateModalOpen(true)} className="hidden sm:inline-flex">
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.transactions.add')}
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">{t('pages.transactions.failedToLoad')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.transactions.title')}
        description={t('pages.transactions.description')}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} className="hidden sm:inline-flex">
            <Plus className="mr-2 h-4 w-4" />
            {t('pages.transactions.add')}
          </Button>
        }
      />

      {/* Filters Control Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('pages.transactions.searchPlaceholder')}
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
              {t('pages.transactions.resetFilters')}
            </Button>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: t('pages.transactions.thisMonth'),
              action: () => {
                const now = new Date();
                setYearFilter(now.getFullYear().toString());
                setMonthFilter((now.getMonth() + 1).toString());
              },
            },
            {
              label: t('pages.transactions.lastMonth'),
              action: () => {
                const prev = new Date();
                prev.setMonth(prev.getMonth() - 1);
                setYearFilter(prev.getFullYear().toString());
                setMonthFilter((prev.getMonth() + 1).toString());
              },
            },
            {
              label: t('pages.transactions.last3Months'),
              action: () => {
                const now = new Date();
                setYearFilter(now.getFullYear().toString());
                setMonthFilter('all');
              },
            },
            {
              label: t('pages.transactions.thisYear'),
              action: () => {
                setYearFilter(new Date().getFullYear().toString());
                setMonthFilter('all');
              },
            },
          ].map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              onClick={preset.action}
            >
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('common.year')} /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('common.month')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.transactions.allMonths')}</SelectItem>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {formatMonth(i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('common.type')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.transactions.allTypes')}</SelectItem>
              <SelectItem value="income">{t('types.income')}</SelectItem>
              <SelectItem value="expense">{t('types.expense')}</SelectItem>
              <SelectItem value="saving">{t('types.saving')}</SelectItem>
              <SelectItem value="investment">{t('types.investment')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('common.category')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.transactions.allCategories')}</SelectItem>
              {categories
                .slice()
                .sort((a, b) => a.category_name.localeCompare(b.category_name))
                .map(c => <SelectItem key={c.categories_id_pk} value={c.categories_id_pk.toString()}>{c.category_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('common.account')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.transactions.allAccounts')}</SelectItem>
              {accounts
                .slice()
                .sort((a, b) => a.account_name.localeCompare(b.account_name))
                .map(a => <SelectItem key={a.accounts_id_pk} value={a.accounts_id_pk}>{a.account_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={fundFilter} onValueChange={setFundFilter}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('pages.transactions.savingsFund')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('pages.transactions.allFunds')}</SelectItem>
              <SelectItem value="none">{t('pages.transactions.notAssigned')}</SelectItem>
              {funds
                .slice()
                .sort((a, b) => a.fund_name.localeCompare(b.fund_name))
                .map(f => <SelectItem key={f.savings_funds_id_pk} value={f.savings_funds_id_pk}>{f.fund_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input
            placeholder={t('pages.transactions.minAmount')}
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_INPUT_PATTERN}
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
            className="bg-background/50 border-input/50"
          />

          <Input
            placeholder={t('pages.transactions.maxAmount')}
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_INPUT_PATTERN}
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
                <TableHead className="w-32 pl-6">{t('common.date')}</TableHead>
                <TableHead>{t('common.notes')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('common.category')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('common.account')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('pages.transactions.fund')}</TableHead>
                <TableHead className="text-right pr-6">{t('common.amount')}</TableHead>
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
            title={t('pages.transactions.noTransactionsTitle')}
            description={t('pages.transactions.noTransactionsDescription')}
            action={{
              label: t('pages.transactions.add'),
              onClick: () => setIsCreateModalOpen(true),
            }}
            className="m-6 border-0 bg-transparent"
          />
        ) : (
          <>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="w-32 pl-6 font-semibold">{t('common.date')}</TableHead>
                    <TableHead className="font-semibold">{t('common.notes')}</TableHead>
                    <TableHead className="hidden sm:table-cell font-semibold">{t('common.category')}</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">{t('common.account')}</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">{t('pages.transactions.fund')}</TableHead>
                    <TableHead className="text-right pr-6 font-semibold">{t('common.amount')}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction, rowIndex) => {
                    const category = categoryMap[transaction.category_id_fk];
                    const account = accountMap[transaction.account_id_fk];
                    const fund = transaction.savings_fund_id_fk ? fundMap[transaction.savings_fund_id_fk] : null;
                    const txType = category?.type || 'expense';
                    return (
                      <TableRow key={transaction.id_pk} className={cn(
                        'group border-b border-border/40 last:border-0 transition-colors',
                        rowIndex % 2 === 0 ? 'bg-transparent hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'
                      )}>
                        <TableCell className="font-mono text-xs text-muted-foreground pl-4">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm text-foreground">{transaction.notes || '-'}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              txType === 'income' ? 'bg-emerald-500' :
                              txType === 'saving' ? 'bg-sky-500' :
                              txType === 'investment' ? 'bg-purple-500' : 'bg-rose-500'
                            )} />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              {category?.category_name || t('common.unknown')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {account?.account_name || t('common.unknown')}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {fund ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                              <span>{fund.fund_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className="font-mono font-medium text-foreground">
                            <SensitiveValue>{transaction.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}</SensitiveValue>
                          </span>
                        </TableCell>
                        <TableCell className="relative pr-0">
                          {/* Colored stripe at far right of the table row */}
                          <span className={cn(
                            'absolute right-0 top-0 bottom-0 w-[2px]',
                            txType === 'income' ? 'bg-emerald-500' :
                            txType === 'saving' ? 'bg-sky-500' :
                            txType === 'investment' ? 'bg-purple-500' : 'bg-rose-500'
                          )} />
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
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(transaction.id_pk)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {transactions.map((transaction) => {
                const category = categoryMap[transaction.category_id_fk];
                const account = accountMap[transaction.account_id_fk];
                const txType = category?.type || 'expense';
                return (
                  <div key={transaction.id_pk} className={cn(
                    'p-4 rounded-xl border bg-card shadow-sm space-y-3 border-r-2',
                    txType === 'income'
                      ? 'border-r-emerald-500'
                      : txType === 'saving'
                      ? 'border-r-sky-500'
                      : txType === 'investment'
                      ? 'border-r-purple-500'
                      : 'border-r-rose-500'
                  )}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{transaction.notes || t('pages.transactions.noDescription')}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                      <div className="font-bold text-foreground">
                        <SensitiveValue>{transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}</SensitiveValue>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t text-sm">
                      <div className="flex gap-2 items-center">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          txType === 'income' ? 'bg-emerald-500/10 text-emerald-500' :
                          txType === 'saving' ? 'bg-sky-500/10 text-sky-500' :
                          txType === 'investment' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-rose-500/10 text-rose-500'
                        )}>
                          {category?.category_name || t('common.unknown')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {account?.account_name || t('common.unknown')}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(transaction)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(transaction.id_pk)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>




            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{rangeStart}</span>-
                <span className="font-medium text-foreground">{rangeEnd}</span> transactions
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
                    disabled={!hasNextPage}
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
              {selectedTransaction ? t('pages.transactions.editTitle') : t('pages.transactions.addTitle')}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {selectedTransaction ? t('pages.transactions.editDescription') : t('pages.transactions.addDescription')}
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <Input
                id="notes"
                placeholder={t('pages.transactions.notesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('common.amount')}</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  pattern={DECIMAL_INPUT_PATTERN}
                  enterKeyHint="done"
                  placeholder={formatNumber(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="text-[16px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t('common.date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal bg-background/50 border-input/50",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      {formData.date ? (
                        formatDate(formData.date, { dateStyle: 'long' })
                      ) : (
                        <span>{t('pages.transactions.pickDate')}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Adjust for timezone offset to prevent date shifting when converting to string
                          const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                          setFormData({ ...formData, date: offsetDate.toISOString().split('T')[0] });
                        }
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                  {t('pages.transactions.withdrawalFromFund')}
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t('pages.transactions.withdrawalHelp')}</p>
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
                  {t('pages.transactions.transferBetweenAccounts')}
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{t('pages.transactions.transferHelp')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {!isWithdrawal && !isTransfer && (
              <div className="space-y-2">
                <Label htmlFor="category">{t('common.category')}</Label>
                <Select
                  value={formData.category_id_fk}
                  onValueChange={(value) => setFormData({ ...formData, category_id_fk: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pages.transactions.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.is_active !== false)
                      .sort((a, b) => a.category_name.localeCompare(b.category_name))
                      .map((cat) => (
                      <SelectItem key={cat.categories_id_pk} value={cat.categories_id_pk.toString()}>
                        {cat.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="account">{t('common.account')}</Label>
              <Select
                value={formData.account_id_fk}
                onValueChange={(value) => setFormData({ ...formData, account_id_fk: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('pages.transactions.selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(a => a.account_is_active !== false)
                    .sort((a, b) => a.account_name.localeCompare(b.account_name))
                    .map((acc) => (
                    <SelectItem key={acc.accounts_id_pk} value={acc.accounts_id_pk}>
                      {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isTransfer && (
              <div className="space-y-2">
                <Label htmlFor="to-account">{t('pages.transactions.toAccount')}</Label>
                <Select
                  value={transferToAccountId}
                  onValueChange={setTransferToAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pages.transactions.selectDestinationAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(acc => acc.account_is_active !== false && acc.accounts_id_pk !== formData.account_id_fk)
                      .sort((a, b) => a.account_name.localeCompare(b.account_name))
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
                  <Label htmlFor="fund">{isWithdrawal ? t('pages.transactions.savingsFund') : t('pages.transactions.savingsFundOptional')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{t('pages.transactions.fundHelp')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={formData.savings_fund_id_fk || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, savings_fund_id_fk: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pages.transactions.selectFund')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none')}</SelectItem>
                    {funds
                      .filter(f => f.fund_is_active !== false)
                      .sort((a, b) => a.fund_name.localeCompare(b.fund_name))
                      .map((fund) => (
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedTransaction ? t('common.save') : t('pages.transactions.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Floating Action Button */}
      <Button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-[6.5rem] right-4 z-40 h-14 w-14 rounded-full shadow-xl sm:hidden"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div >
  );
}
