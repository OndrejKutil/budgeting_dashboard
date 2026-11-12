import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { useAvailableYears } from '@/hooks/use-available-years';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Field, FormAlert } from '@/components/ui/field';
import { fieldAria, useFormErrors } from '@/hooks/use-form-errors';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
  PiggyBank,
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
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { transactionsApi, categoriesApi, accountsApi, fundsApi, tagsApi } from '@/lib/api/endpoints';
import { Transaction, Category, Account, SavingsFund, Tag, CreateTransactionRequest, UpdateTransactionRequest } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import type { DashboardTranslationKey } from '@/lib/i18n';
import { formatMoney } from '@/lib/currency';
import { useDebounce } from '@/hooks/use-debounce';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { AccountBalance, AccountSelect } from '@/components/AccountSelect';
import { accountLabel, useAccountSections } from '@/hooks/use-account-sections';
import { MultiSelect, type MultiSelectGroup } from '@/components/MultiSelect';
import { Badge } from '@/components/ui/badge';
import { TagMultiSelect } from '@/components/TagMultiSelect';
import { Tags } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ITEMS_PER_PAGE: number = 20;
const DECIMAL_INPUT_PATTERN = "-?[0-9]*([.,][0-9]*)?";

// Categories are grouped by type in both the form picker and the filter, so the ordering
// lives here rather than inside either one's JSX.
const CATEGORY_TYPE_ORDER = ['expense', 'income', 'saving', 'investment', 'exclude', 'transfer'] as const;
const CATEGORY_TYPE_LABEL_KEY: Record<string, DashboardTranslationKey> = {
  expense: 'metrics.expenses', income: 'metrics.income', saving: 'types.saving',
  investment: 'metrics.investments', exclude: 'types.exclude', transfer: 'types.transfer',
};

/**
 * Filters persist to the URL and session storage as a single string, so a multi-select
 * stores its picks comma-joined. 'all' is the legacy sentinel for "no filter" and stays —
 * it keeps old bookmarked URLs working and reads better in the bar than an empty param.
 */
function parseFilter(value: string): string[] {
  return !value || value === 'all' ? [] : value.split(',');
}

function serializeFilter(values: string[]): string {
  return values.length ? values.join(',') : 'all';
}

/** `YYYY-MM` — how a picked month is stored, sent, and compared. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** `monthsAgo(0)` is this month; the Date constructor rolls negative months into last year. */
function monthsAgo(count: number): string {
  const now = new Date();
  return monthKey(new Date(now.getFullYear(), now.getMonth() - count, 1));
}

/**
 * Read the month filter, upgrading the format it used to have.
 *
 * Months were once bare numbers scoped to the Year select; they now carry their year so a
 * selection can span one (Nov + Dec + Jan). Saved sessions and shared links still hold the
 * old shape, and an unqualified "3" would reach the backend as a malformed month — so
 * anything without a year gets the selected one.
 */
function parseMonths(value: string, fallbackYear: string): string[] {
  return parseFilter(value).map(month =>
    month.includes('-') ? month : `${fallbackYear}-${month.padStart(2, '0')}`,
  );
}

/**
 * A transfer writes two ledger rows. When the second create fails the first is already posted,
 * so the error message has to say that rather than implying nothing happened. Declared at module
 * scope so `instanceof` stays valid across re-renders.
 */
class PartialTransferError extends Error {}

function isNegativeAmountInput(value: string): boolean {
  return value.trim().startsWith('-');
}

function toggleAmountSign(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) return '-';
  if (trimmedValue.startsWith('-')) return trimmedValue.slice(1);

  return `-${trimmedValue}`;
}

/**
 * An FX rate and its reciprocal live on wildly different scales — 25.1234 CZK/EUR against
 * 0.0398 EUR/CZK — so a fixed decimal count either wastes digits on one side or throws
 * away precision on the other. Anchor on significant digits below 1 instead.
 */
function formatRate(rate: number): string {
  return rate >= 1 ? rate.toFixed(4) : rate.toPrecision(4);
}

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
  const { formatCurrency, formatDate, formatMonth, formatNumber, t, currency: userCurrency } = useUser();
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
  const [tagFilter, setTagFilter] = useUrlState<string>('tag', 'all');

  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedMin = useDebounce(minAmount, 500);
  const debouncedMax = useDebounce(maxAmount, 500);

  // Tag management state (within modal)
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState('');

  const clearFilters = () => {
    const prefix = `budget-dashboard:${location.pathname}`;
    const keys = ['q', 'category', 'account', 'fund', 'type', 'min', 'max', 'year', 'month', 'tag'];
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

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await tagsApi.getAll();
      return res.data || [];
    },
  });

  // Years with data, plus one ahead because transactions can be dated into the future.
  const availableYears = useAvailableYears({ future: 1 });
  const years = useMemo(() => availableYears.map(String), [availableYears]);

  // Option groups for the multi-select filters. Accounts reuse the picker's sectioning so
  // the filter and the form never order the same accounts differently; inactive accounts
  // stay listed here because their past transactions are still in the ledger.
  const accountSections = useAccountSections(accounts, { includeInactive: true });
  const accountOptionGroups: MultiSelectGroup[] = accountSections.map(section => ({
    key: section.key,
    label: accountSections.length > 1 ? section.label : undefined,
    options: section.items.map(acc => ({
      value: acc.accounts_id_pk,
      label: accountLabel(acc),
      hint: <AccountBalance account={acc} />,
    })),
  }));

  const categoryOptionGroups: MultiSelectGroup[] = CATEGORY_TYPE_ORDER
    .map(type => ({
      key: type,
      label: t(CATEGORY_TYPE_LABEL_KEY[type]),
      options: categories
        .filter(c => c.type === type)
        .sort((a, b) => a.category_name.localeCompare(b.category_name))
        .map(c => ({ value: c.categories_id_pk.toString(), label: c.category_name })),
    }))
    .filter(group => group.options.length > 0);

  const typeOptionGroups: MultiSelectGroup[] = [{
    key: 'type',
    options: (['income', 'expense', 'saving', 'investment'] as const)
      .map(type => ({ value: type, label: t(`types.${type}`) })),
  }];

  const fundOptionGroups: MultiSelectGroup[] = [{
    key: 'fund',
    options: [
      // 'none' is the unassigned sentinel the backend turns into an IS NULL check.
      { value: 'none', label: t('pages.transactions.notAssigned') },
      ...funds
        .slice()
        .sort((a, b) => a.fund_name.localeCompare(b.fund_name))
        .map(f => ({ value: f.savings_funds_id_pk, label: f.fund_name })),
    ],
  }];

  const tagOptionGroups: MultiSelectGroup[] = [{
    key: 'tag',
    options: tags
      .slice()
      .sort((a, b) => a.tag_name.localeCompare(b.tag_name))
      .map(tag => ({ value: tag.tags_id_pk.toString(), label: tag.tag_name })),
  }];

  // Months are listed under year headers so a span like Nov + Dec + Jan can be selected as
  // one thing. Same year range the Year select offers — a second, different range would
  // just raise the question of why they disagree.
  const monthOptionGroups: MultiSelectGroup[] = years.map(year => ({
    key: year,
    label: year,
    options: [...Array(12)].map((_, i) => ({
      value: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: formatMonth(i),
      // In the menu the year header carries the year; on the trigger there is no header,
      // and a bare "November" would not say which year it came from.
      triggerLabel: `${formatMonth(i)} ${year}`,
    })),
  }));

  const selectedMonths = parseMonths(monthFilter, yearFilter);

  // Shared filter params (used by both the list query and the summary query).
  // The multi-value filters travel as the same comma-joined string they are stored as;
  // the backend splits them (see helper/transaction_filters.py).
  const commonFilterParams = {
    search: debouncedSearch || undefined,
    category_id: categoryFilter === 'all' ? undefined : categoryFilter,
    account_id: accountFilter === 'all' ? undefined : accountFilter,
    savings_fund_id: fundFilter === 'all' ? undefined : fundFilter,
    category_type: typeFilter === 'all' ? undefined : typeFilter,
    min_amount: parseDecimalInput(debouncedMin) ?? undefined,
    max_amount: parseDecimalInput(debouncedMax) ?? undefined,
    tag_id: tagFilter === 'all' ? undefined : tagFilter,
    // Picked months are disjoint spans that can cross a year (Nov + Dec + Jan), which no
    // single range expresses — so when any are picked they are the whole date filter and
    // the year bounds drop out. The Year select only scopes the unfiltered case.
    start_date: selectedMonths.length ? undefined : `${yearFilter}-01-01`,
    end_date: selectedMonths.length ? undefined : `${yearFilter}-12-31`,
    months: selectedMonths.length ? selectedMonths.join(',') : undefined,
  };

  const anyFilterActive = categoryFilter !== 'all' || accountFilter !== 'all' || fundFilter !== 'all' || typeFilter !== 'all' || tagFilter !== 'all' || monthFilter !== 'all' || minAmount || maxAmount || searchQuery;

  const activeFilterCount = [categoryFilter, accountFilter, fundFilter, typeFilter, tagFilter, monthFilter]
    .filter(value => value !== 'all').length + (minAmount ? 1 : 0) + (maxAmount ? 1 : 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The summary total mixes transactions from accounts in different currencies, so the
  // backend converts everything into the user's currency before summing.
  const { data: summaryData } = useQuery({
    queryKey: ['transactions-summary', commonFilterParams, userCurrency],
    queryFn: () => transactionsApi.getSummary({ ...commonFilterParams, base_currency: userCurrency }),
    enabled: !!anyFilterActive,
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
      month: monthFilter,
      tag: tagFilter,
    }],
    queryFn: () => transactionsApi.getAll({
      limit: ITEMS_PER_PAGE,
      offset,
      ...commonFilterParams,
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
  // Copy prefills the create form from an existing row; it only changes the modal's wording,
  // the submit path stays the create one (selectedTransaction is left null on purpose).
  const [isCopy, setIsCopy] = useState(false);
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [transferDestAmount, setTransferDestAmount] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    category_id_fk: '',
    account_id_fk: '',
    savings_fund_id_fk: '',
    tags: [] as number[],
  });

  type TransactionField = 'amount' | 'category' | 'account' | 'toAccount' | 'destAmount' | 'fund';
  const { errors: formErrors, show: showFormErrors, clear: clearFormError, reset: resetFormErrors } = useFormErrors<TransactionField>();
  // A failed save keeps the modal open, so the reason is shown inside it rather than in a
  // toast that lands behind the overlay and times out.
  const [submitError, setSubmitError] = useState<string | null>(null);

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






  // Reset page when filters change. Every filter belongs here, not just a few: narrowing
  // the set while on page 5 otherwise leaves you staring at an empty list with no hint
  // that the results are one page back — and multi-select makes narrowing a lot easier.
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    categoryFilter, accountFilter, fundFilter, typeFilter, tagFilter,
    yearFilter, monthFilter, debouncedSearch, debouncedMin, debouncedMax,
  ]);

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
      const message = getErrorMessage(err, t('pages.transactions.deleteFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    }
  });

  // Deleting is permanent, so the row menu only opens a confirmation; the dialog does the delete.
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const handleDelete = (transaction: Transaction) => setPendingDelete(transaction);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTransactionRequest) => transactionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      toast({ title: t('pages.transactions.created') });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      setSubmitError(getErrorMessage(err, t('pages.transactions.saveFailed')));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionRequest }) => transactionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      toast({ title: t('pages.transactions.updated') });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      setSubmitError(getErrorMessage(err, t('pages.transactions.saveFailed')));
    }
  });

  const transferMutation = useMutation({
    mutationFn: async ({ outgoing, incoming }: { outgoing: CreateTransactionRequest; incoming: CreateTransactionRequest }) => {
      await transactionsApi.create(outgoing);
      try {
        await transactionsApi.create(incoming);
      } catch (err) {
        throw new PartialTransferError(getErrorMessage(err, String(err)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Update account balances
      toast({ title: t('pages.transactions.transferCompleted') });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      // One leg may have landed — refetch so the list reflects whatever actually posted.
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });

      const message = err instanceof PartialTransferError
        ? t('pages.transactions.transferPartialFailed')
        : getErrorMessage(err, t('pages.transactions.transferFailed'));
      setSubmitError(message);
    },
  });

  // Covers all three write paths the save button can trigger. This previously read a dead
  // `isSubmitting` state that was never set, so the button stayed enabled during a create and
  // a double-click posted the transaction twice.
  const isSaving = createMutation.isPending || updateMutation.isPending || transferMutation.isPending;

  const handleSubmit = async () => {
    setSubmitError(null);

    if (isTransfer) {
      const amount = parseDecimalInput(formData.amount);
      const sourceCurrency = accountMap[formData.account_id_fk]?.currency;
      const destCurrency = accountMap[transferToAccountId]?.currency;
      const isCrossCurrency = sourceCurrency && destCurrency && sourceCurrency !== destCurrency;
      const destAmount = isCrossCurrency ? parseDecimalInput(transferDestAmount) : null;

      const transferErrors: Partial<Record<TransactionField, string>> = {};
      if (!formData.amount.trim()) transferErrors.amount = t('pages.transactions.amountRequired');
      else if (amount === null || amount === 0) transferErrors.amount = t('pages.transactions.amountInvalid');
      if (!formData.account_id_fk) transferErrors.account = t('pages.transactions.accountRequired');
      if (!transferToAccountId) transferErrors.toAccount = t('pages.transactions.toAccountRequired');
      if (isCrossCurrency && (destAmount === null || destAmount <= 0)) {
        transferErrors.destAmount = t('pages.transactions.transferDestAmountRequired');
      }
      if (!showFormErrors(transferErrors) || amount === null) return;

      // Find 'Exclude' category
      const excludeCategory = categories.find(c => c.category_name === 'Exclude');
      if (!excludeCategory) {
        setSubmitError(t('pages.transactions.excludeMissing'));
        return;
      }

      const categoryId = excludeCategory.categories_id_pk;

      // 1. Outgoing Transaction (Negative) — in source account's currency
      const outgoingPayload = {
        account_id_fk: formData.account_id_fk,
        category_id_fk: categoryId,
        amount: -Math.abs(amount),
        date: formData.date,
        notes: t('pages.transactions.transferTo', { account: accountMap[transferToAccountId]?.account_name || t('common.account'), notes: formData.notes || '' }),
        savings_fund_id_fk: null,
      };

      // 2. Incoming Transaction (Positive) — in destination account's currency
      const incomingPayload = {
        account_id_fk: transferToAccountId,
        category_id_fk: categoryId,
        amount: isCrossCurrency ? Math.abs(destAmount!) : Math.abs(amount),
        date: formData.date,
        notes: t('pages.transactions.transferFrom', { account: accountMap[formData.account_id_fk]?.account_name || t('common.account'), notes: formData.notes || '' }),
        savings_fund_id_fk: null,
      };

      transferMutation.mutate({ outgoing: outgoingPayload, incoming: incomingPayload });
      return;
    }

    const amount = parseDecimalInput(formData.amount);

    // The withdrawal category is picked for the user, so there is no field to point at
    // when it is missing — that one is a setup problem and goes to the form-level message.
    if (isWithdrawal && !formData.category_id_fk) {
      setSubmitError(t('pages.transactions.withdrawalCategoryMissing'));
      return;
    }

    const fieldErrors: Partial<Record<TransactionField, string>> = {};
    if (!formData.amount.trim()) fieldErrors.amount = t('pages.transactions.amountRequired');
    else if (amount === null) fieldErrors.amount = t('pages.transactions.amountInvalid');
    if (!formData.category_id_fk) fieldErrors.category = t('pages.transactions.categoryRequired');
    if (!formData.account_id_fk) fieldErrors.account = t('pages.transactions.accountRequired');
    if (isWithdrawal && !formData.savings_fund_id_fk) fieldErrors.fund = t('pages.transactions.fundRequired');
    if (!showFormErrors(fieldErrors) || amount === null) return;

    const payload = {
      account_id_fk: formData.account_id_fk,
      category_id_fk: parseInt(formData.category_id_fk),
      amount,
      date: formData.date,
      notes: formData.notes || null,
      savings_fund_id_fk: formData.savings_fund_id_fk || null,
      tags: formData.tags,
    };

    if (selectedTransaction) {
      updateMutation.mutate({ id: selectedTransaction.id_pk, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsCopy(false);

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
      tags: transaction.tags?.map(t => t.tags_id_pk) || [],
    });
  };

  /**
   * Prefills the create form with an existing transaction's values. Mirrors openEditModal
   * except that selectedTransaction stays null, so saving goes through createMutation and
   * the original row is left untouched.
   */
  const openCopyModal = (transaction: Transaction) => {
    setSelectedTransaction(null);
    setIsCopy(true);

    const category = categoryMap[transaction.category_id_fk];
    setIsWithdrawal(category?.category_name === 'Savings Funds Withdrawal');
    setIsTransfer(false);
    setTransferToAccountId('');
    setTransferDestAmount('');

    setFormData({
      amount: transaction.amount.toString(),
      date: transaction.date,
      notes: transaction.notes || '',
      category_id_fk: transaction.category_id_fk.toString(),
      account_id_fk: transaction.account_id_fk,
      savings_fund_id_fk: transaction.savings_fund_id_fk || '',
      tags: transaction.tags?.map(t => t.tags_id_pk) || [],
    });

    setIsCreateModalOpen(true);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setSelectedTransaction(null);
    setIsCopy(false);
    setIsWithdrawal(false);
    setIsTransfer(false);
    setTransferToAccountId('');
    setTransferDestAmount('');
    resetFormErrors();
    setSubmitError(null);
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      category_id_fk: '',
      account_id_fk: '',
      savings_fund_id_fk: '',
      tags: [],
    });
  };

  type TransactionMode = 'standard' | 'transfer' | 'withdrawal';
  const mode: TransactionMode = isTransfer ? 'transfer' : isWithdrawal ? 'withdrawal' : 'standard';

  const changeMode = (next: TransactionMode) => {
    if (next === mode) return;
    setIsTransfer(next === 'transfer');
    setIsWithdrawal(next === 'withdrawal');
    resetFormErrors();
    setSubmitError(null);
    // Withdrawals always post to their dedicated category; the other modes start with none
    // (a transfer sets its own on save).
    const withdrawalCat = next === 'withdrawal'
      ? categories.find(c => c.category_name === 'Savings Funds Withdrawal')
      : undefined;
    setFormData(prev => ({ ...prev, category_id_fk: withdrawalCat ? withdrawalCat.categories_id_pk.toString() : '' }));
  };

  const modeOptions: { value: TransactionMode; label: string; icon: typeof Receipt; help: string | null }[] = [
    { value: 'standard', label: t('pages.transactions.modeStandard'), icon: Receipt, help: null },
    { value: 'transfer', label: t('pages.transactions.modeTransfer'), icon: ArrowLeftRight, help: t('pages.transactions.transferHelp') },
    { value: 'withdrawal', label: t('pages.transactions.modeWithdrawal'), icon: PiggyBank, help: t('pages.transactions.withdrawalHelp') },
  ];
  const modeHelp = modeOptions.find(option => option.value === mode)?.help;

  const isAmountNegative = isNegativeAmountInput(formData.amount);
  const amountSignActionLabel = isAmountNegative
    ? t('pages.transactions.setAmountPositive')
    : t('pages.transactions.setAmountNegative');

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
          <div className="flex gap-2">
            {/* On a phone the nine filter controls used to fill the whole first screen, pushing
                the list below the fold; they now sit behind this toggle there. */}
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(open => !open)}
              aria-expanded={filtersOpen}
              aria-controls="transaction-filters"
              className="flex-1 sm:hidden"
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('pages.transactions.filters')}
              {activeFilterCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {!!anyFilterActive && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {t('pages.transactions.resetFilters')}
              </Button>
            )}
          </div>
        </div>

        {/* Quick Date Presets — one swipeable row on a phone instead of wrapping to two. */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {[
            {
              label: t('pages.transactions.thisMonth'),
              action: () => setMonthFilter(serializeFilter([monthsAgo(0)])),
            },
            {
              label: t('pages.transactions.lastMonth'),
              action: () => setMonthFilter(serializeFilter([monthsAgo(1)])),
            },
            {
              label: t('pages.transactions.last3Months'),
              action: () => setMonthFilter(serializeFilter([monthsAgo(2), monthsAgo(1), monthsAgo(0)])),
            },
            {
              // The only preset with no months: clearing them is what hands the date range
              // back to the Year select.
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
              className="h-8 shrink-0 text-xs bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors sm:h-7"
              onClick={preset.action}
            >
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {preset.label}
            </Button>
          ))}
        </div>

        <div
          id="transaction-filters"
          className={cn("grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3 sm:grid", filtersOpen ? "grid" : "hidden")}
        >
          {/* Picked months carry their own year, so the Year select has nothing left to say
              while any are selected. */}
          <Select value={yearFilter} onValueChange={setYearFilter} disabled={selectedMonths.length > 0}>
            <SelectTrigger className="bg-background/50 border-input/50"><SelectValue placeholder={t('common.year')} /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <MultiSelect
            groups={monthOptionGroups}
            selected={selectedMonths}
            onChange={values => setMonthFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allMonths')}
            className="bg-background/50 border-input/50"
          />

          <MultiSelect
            groups={typeOptionGroups}
            selected={parseFilter(typeFilter)}
            onChange={values => setTypeFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allTypes')}
            className="bg-background/50 border-input/50"
          />

          <MultiSelect
            groups={categoryOptionGroups}
            selected={parseFilter(categoryFilter)}
            onChange={values => setCategoryFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allCategories')}
            className="bg-background/50 border-input/50"
          />

          <MultiSelect
            groups={accountOptionGroups}
            selected={parseFilter(accountFilter)}
            onChange={values => setAccountFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allAccounts')}
            className="bg-background/50 border-input/50"
          />

          <MultiSelect
            groups={fundOptionGroups}
            selected={parseFilter(fundFilter)}
            onChange={values => setFundFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allFunds')}
            className="bg-background/50 border-input/50"
          />

          <MultiSelect
            groups={tagOptionGroups}
            selected={parseFilter(tagFilter)}
            onChange={values => setTagFilter(serializeFilter(values))}
            allLabel={t('pages.transactions.allTags')}
            className="bg-background/50 border-input/50"
          />

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

      {/* Filtered Summary Bar */}
      {anyFilterActive && summaryData && (
        <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
          <Tags className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{summaryData.count}</span> transactions &nbsp;·&nbsp; total{' '}
            <span className="font-semibold text-foreground font-mono">
              <SensitiveValue>{formatCurrency(summaryData.total_amount)}</SensitiveValue>
            </span>
          </span>
        </div>
      )}

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
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm text-foreground">{transaction.notes || '-'}</span>
                            {transaction.tags && transaction.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {transaction.tags.map(tag => (
                                  <Badge key={tag.tags_id_pk} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                    {tag.tag_name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              txType === 'income' ? 'bg-emerald-500' :
                              txType === 'saving' ? 'bg-chart-savings' :
                              txType === 'investment' ? 'bg-chart-investment' : 'bg-rose-500'
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
                            <SensitiveValue>{transaction.amount > 0 ? '+' : '-'}{formatMoney(Math.abs(transaction.amount), account?.currency || 'CZK')}</SensitiveValue>
                          </span>
                        </TableCell>
                        <TableCell className="relative pr-0">
                          {/* Colored stripe at far right of the table row */}
                          <span className={cn(
                            'absolute right-0 top-0 bottom-0 w-[2px]',
                            txType === 'income' ? 'bg-emerald-500' :
                            txType === 'saving' ? 'bg-chart-savings' :
                            txType === 'investment' ? 'bg-chart-investment' : 'bg-rose-500'
                          )} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`${t('common.actions')}: ${transaction.notes || t('pages.transactions.noDescription')}`}
                                className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(transaction)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCopyModal(transaction)}>
                                <Copy className="mr-2 h-4 w-4" />
                                {t('common.duplicate')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(transaction)}
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
                    'p-4 rounded-xl border bg-card shadow-sm space-y-3',
                    txType === 'income'
                      ? 'border-emerald-500/30'
                      : txType === 'saving'
                      ? 'border-chart-savings/30'
                      : txType === 'investment'
                      ? 'border-chart-investment/35'
                      : 'border-rose-500/30'
                  )}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{transaction.notes || t('pages.transactions.noDescription')}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(transaction.date)}
                        </div>
                        {transaction.tags && transaction.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {transaction.tags.map(tag => (
                              <Badge key={tag.tags_id_pk} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                {tag.tag_name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-foreground">
                        <SensitiveValue>{transaction.amount > 0 ? '+' : ''}{formatMoney(transaction.amount, account?.currency || 'CZK')}</SensitiveValue>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t text-sm">
                      <div className="flex gap-2 items-center">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          txType === 'income' ? 'bg-emerald-500/10 text-emerald-500' :
                          txType === 'saving' ? 'bg-chart-savings/10 text-chart-savings' :
                          txType === 'investment' ? 'bg-chart-investment/10 text-chart-investment' :
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
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${t('common.actions')}: ${transaction.notes || t('pages.transactions.noDescription')}`}
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(transaction)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCopyModal(transaction)}>
                            <Copy className="mr-2 h-4 w-4" />
                            {t('common.duplicate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(transaction)}
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
                {t('pages.transactions.showing')} <span className="font-medium text-foreground">{rangeStart}</span>-
                <span className="font-medium text-foreground">{rangeEnd}</span> {t('pages.transactions.showingSuffix')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  className="hidden sm:flex h-8 bg-background/50"
                >
                  {t('pages.transactions.newest')}
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
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onClick={() => setPage(page + 1)}
                    className="h-8 bg-background/50"
                  >
                    {t('common.next')}
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
              {selectedTransaction
                ? t('pages.transactions.editTitle')
                : isCopy
                  ? t('pages.transactions.copyTitle')
                  : t('pages.transactions.addTitle')}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {selectedTransaction
                ? t('pages.transactions.editDescription')
                : isCopy
                  ? t('pages.transactions.copyDescription')
                  : t('pages.transactions.addDescription')}
            </div>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSaving) handleSubmit();
            }}
          >
          <div className="space-y-4 py-4">
            <FormAlert>{submitError}</FormAlert>

            {/* What kind of entry this is. One control instead of two checkboxes that
                silently cancelled each other; the help sits under it because a tooltip
                is unreachable on touch. */}
            <div className="space-y-2">
              <div
                role="radiogroup"
                aria-label={t('pages.transactions.modeLabel')}
                className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
              >
                {modeOptions.map(({ value, label, icon: Icon }) => {
                  // An existing row cannot be turned into the two rows a transfer needs.
                  const disabled = value === 'transfer' && !!selectedTransaction;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={mode === value}
                      disabled={disabled}
                      onClick={() => changeMode(value)}
                      className={cn(
                        "flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        mode === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
              {modeHelp && <p className="text-xs text-muted-foreground">{modeHelp}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <Input
                id="notes"
                placeholder={t('pages.transactions.notesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
              <Field htmlFor="amount" label={t('common.amount')} error={formErrors.amount}>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={amountSignActionLabel}
                        aria-pressed={isAmountNegative}
                        onClick={() => setFormData(prev => ({ ...prev, amount: toggleAmountSign(prev.amount) }))}
                        className={cn(
                          "h-10 w-10 shrink-0 bg-background/50 text-base font-semibold tabular-nums",
                          isAmountNegative && "border-destructive/60 text-destructive hover:text-destructive"
                        )}
                      >
                        {isAmountNegative ? '-' : '+'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{amountSignActionLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    pattern={DECIMAL_INPUT_PATTERN}
                    enterKeyHint="done"
                    placeholder={formatNumber(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData({ ...formData, amount: e.target.value });
                      clearFormError('amount');
                    }}
                    className="min-w-0 text-[16px] tabular-nums"
                    {...fieldAria('amount', formErrors.amount)}
                  />
                </div>
              </Field>
              <div className="space-y-2">
                <Label htmlFor="date">{t('common.date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      type="button"
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal bg-background/50 border-input/50",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      {formData.date ? (
                        formatDate(formData.date, { dateStyle: 'medium' })
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
                      disabled={(date) => {
                        // Allow future dates (up to a year) so prepaid costs can be booked to the month they belong to
                        const maxDate = new Date();
                        maxDate.setFullYear(maxDate.getFullYear() + 1);
                        return date > maxDate || date < new Date("1900-01-01");
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {mode === 'standard' && (
              <Field htmlFor="category" label={t('common.category')} error={formErrors.category}>
                <Select
                  value={formData.category_id_fk}
                  onValueChange={(value) => {
                    setFormData({ ...formData, category_id_fk: value });
                    clearFormError('category');
                  }}
                >
                  <SelectTrigger id="category" {...fieldAria('category', formErrors.category)}>
                    <SelectValue placeholder={t('pages.transactions.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      return CATEGORY_TYPE_ORDER
                        .map(type => ({
                          type,
                          cats: categories
                            .filter(c => c.is_active !== false && c.type === type)
                            .sort((a, b) => a.category_name.localeCompare(b.category_name)),
                        }))
                        .filter(g => g.cats.length > 0)
                        .map((g, i) => (
                          <SelectGroup key={g.type}>
                            <SelectLabel className={cn(
                              "px-2 pb-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 pl-2",
                              i > 0 && "mt-1 pt-2 border-t border-border/40"
                            )}>
                              {t(CATEGORY_TYPE_LABEL_KEY[g.type])}
                            </SelectLabel>
                            {g.cats.map(cat => (
                              <SelectItem key={cat.categories_id_pk} value={cat.categories_id_pk.toString()}>
                                {cat.category_name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ));
                    })()}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field
              htmlFor="account"
              label={isTransfer ? t('pages.transactions.fromAccount') : t('common.account')}
              error={formErrors.account}
            >
              <AccountSelect
                id="account"
                accounts={accounts}
                value={formData.account_id_fk}
                onValueChange={(value) => {
                  setFormData({ ...formData, account_id_fk: value });
                  clearFormError('account');
                }}
                placeholder={t('pages.transactions.selectAccount')}
                {...fieldAria('account', formErrors.account)}
              />
            </Field>

            {isTransfer && (
              <Field htmlFor="to-account" label={t('pages.transactions.toAccount')} error={formErrors.toAccount}>
                <AccountSelect
                  id="to-account"
                  accounts={accounts}
                  excludeIds={[formData.account_id_fk]}
                  value={transferToAccountId}
                  onValueChange={(value) => {
                    setTransferToAccountId(value);
                    setTransferDestAmount('');
                    clearFormError('toAccount', 'destAmount');
                  }}
                  placeholder={t('pages.transactions.selectDestinationAccount')}
                  {...fieldAria('to-account', formErrors.toAccount)}
                />
              </Field>
            )}

            {isTransfer && transferToAccountId && accountMap[formData.account_id_fk]?.currency && accountMap[transferToAccountId]?.currency && accountMap[formData.account_id_fk]?.currency !== accountMap[transferToAccountId]?.currency && (
              <Field
                htmlFor="dest-amount"
                label={`${t('pages.transactions.receivedAmount')} (${accountMap[transferToAccountId]?.currency})`}
                error={formErrors.destAmount}
                hint={t('pages.transactions.crossCurrencyNote')}
              >
                <Input
                  id="dest-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={transferDestAmount}
                  onChange={(e) => {
                    setTransferDestAmount(e.target.value);
                    clearFormError('destAmount');
                  }}
                  className="text-[16px] tabular-nums"
                  {...fieldAria('dest-amount', formErrors.destAmount)}
                />
                {transferDestAmount && parseDecimalInput(formData.amount) && parseDecimalInput(transferDestAmount) && (() => {
                  // Both directions, always. Which one reads naturally depends on the pair
                  // (1 EUR = 25 CZK is obvious; 1 CZK = 0.04 EUR is not), and which side you
                  // sent from is an accident of the transfer, not of how you think about
                  // the rate — so we never make the user flip it in their head.
                  const from = accountMap[formData.account_id_fk]?.currency;
                  const to = accountMap[transferToAccountId]?.currency;
                  const rate = parseDecimalInput(transferDestAmount)! / Math.abs(parseDecimalInput(formData.amount)!);
                  return (
                    <p className="text-xs text-muted-foreground">
                      {t('pages.transactions.impliedRate')}:{' '}
                      <span className="tabular-nums">1 {from} = {formatRate(rate)} {to}</span>
                      {' · '}
                      <span className="tabular-nums">1 {to} = {formatRate(1 / rate)} {from}</span>
                    </p>
                  );
                })()}
              </Field>
            )}

            {!isTransfer && (
              <Field
                htmlFor="fund"
                label={isWithdrawal ? t('pages.transactions.savingsFund') : t('pages.transactions.savingsFundOptional')}
                error={formErrors.fund}
                hint={isWithdrawal ? undefined : t('pages.transactions.fundHelp')}
              >
                <Select
                  value={formData.savings_fund_id_fk || 'none'}
                  onValueChange={(value) => {
                    setFormData({ ...formData, savings_fund_id_fk: value === 'none' ? '' : value });
                    clearFormError('fund');
                  }}
                >
                  <SelectTrigger id="fund" {...fieldAria('fund', formErrors.fund)}>
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
              </Field>
            )}
            {!isTransfer && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tags">{t('pages.transactions.tags')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                    onClick={() => setIsManageTagsOpen(true)}
                  >
                    {t('pages.transactions.manageTags')}
                  </Button>
                </div>
                <TagMultiSelect
                  id="tags"
                  tags={tags}
                  value={formData.tags}
                  onChange={(ids) => setFormData(prev => ({ ...prev, tags: ids }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedTransaction
                ? t('common.save')
                : isTransfer
                  ? t('pages.transactions.addTransfer')
                  : t('pages.transactions.add')}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Tags Dialog */}
      <Dialog open={isManageTagsOpen} onOpenChange={(open) => {
        setIsManageTagsOpen(open);
        if (!open) { setEditingTagId(null); setEditingTagName(''); }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pages.transactions.manageTagsTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto pr-1">
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('pages.transactions.noTagsYet')}</p>
            )}
            {tags.map(tag => (
              <div key={tag.tags_id_pk} className="flex items-center gap-2 group">
                {editingTagId === tag.tags_id_pk ? (
                  <>
                    <Input
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      className="h-8 flex-1 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const name = editingTagName.trim();
                          if (!name) return;
                          tagsApi.update(tag.tags_id_pk, { tag_name: name }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['tags'] });
                            queryClient.invalidateQueries({ queryKey: ['transactions'] });
                            setEditingTagId(null);
                            setEditingTagName('');
                          }).catch(() => toast({ title: t('pages.transactions.renameTagFailed'), variant: 'destructive' }));
                        }
                        if (e.key === 'Escape') { setEditingTagId(null); setEditingTagName(''); }
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => {
                      const name = editingTagName.trim();
                      if (!name) return;
                      tagsApi.update(tag.tags_id_pk, { tag_name: name }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['tags'] });
                        queryClient.invalidateQueries({ queryKey: ['transactions'] });
                        setEditingTagId(null);
                        setEditingTagName('');
                      }).catch(() => toast({ title: t('pages.transactions.renameTagFailed'), variant: 'destructive' }));
                    }}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setEditingTagId(null); setEditingTagName(''); }}>{t('common.cancel')}</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{tag.tag_name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground"
                      onClick={() => { setEditingTagId(tag.tags_id_pk); setEditingTagName(tag.tag_name); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('pages.transactions.deleteTagTitle', { name: tag.tag_name })}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('pages.transactions.deleteTagDescription')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => {
                              tagsApi.delete(tag.tags_id_pk).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['tags'] });
                                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                                queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
                                setFormData(prev => ({ ...prev, tags: prev.tags.filter(id => id !== tag.tags_id_pk) }));
                              }).catch(() => toast({ title: t('pages.transactions.deleteTagFailed'), variant: 'destructive' }));
                            }}
                          >
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pages.transactions.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('pages.transactions.deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          {pendingDelete && (() => {
            const account = accountMap[pendingDelete.account_id_fk];
            const category = categoryMap[pendingDelete.category_id_fk];
            return (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{pendingDelete.notes || category?.category_name || t('common.unknown')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(pendingDelete.date)} · {category?.category_name || t('common.unknown')} · {account?.account_name || t('common.unknown')}
                    </p>
                  </div>
                  <SensitiveValue className="shrink-0 font-mono font-medium">
                    {pendingDelete.amount > 0 ? '+' : ''}{formatMoney(pendingDelete.amount, account?.currency || 'CZK')}
                  </SensitiveValue>
                </div>
              </div>
            );
          })()}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) deleteMutation.mutate(pendingDelete.id_pk); }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Floating Action Button */}
      <Button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-[6.5rem] right-4 z-40 h-14 w-14 rounded-full shadow-xl sm:hidden"
        size="icon"
        aria-label={t('pages.transactions.add')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div >
  );
}
