import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, ScanLine, X } from 'lucide-react';
import type { OpenAddState } from '@/hooks/use-add-transaction';
import { RECURRING_NOTIFICATIONS_KEY, type OpenEditState } from '@/hooks/use-recurring-notifications';
import { useUrlState } from '@/hooks/use-url-state';
import { useAvailableYears } from '@/hooks/use-available-years';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Button } from '@/components/ui/button';
import { useFormErrors } from '@/hooks/use-form-errors';
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { transactionsApi, categoriesApi, accountsApi, fundsApi, tagsApi, recurringApi } from '@/lib/api/endpoints';
import { Transaction, Category, Account, SavingsFund, CreateTransactionRequest, UpdateTransactionRequest } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { formatMoney } from '@/lib/currency';
import { useDebounce } from '@/hooks/use-debounce';
import { invalidateTransactionData } from '@/lib/query-invalidation';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TransactionFilters } from './transactions/TransactionFilters';
import { TransactionList } from './transactions/TransactionList';
import { TransactionDialog } from './transactions/TransactionDialog';
import { ManageTagsDialog } from './transactions/ManageTagsDialog';
import {
  ITEMS_PER_PAGE,
  PartialTransferError,
  parseDecimalInput,
  parseMonths,
  transactionCountKey,
  type TransactionField,
  type TransactionFormData,
  type TransactionMode,
} from './transactions/helpers';

export default function TransactionsPage() {
  const { formatCurrency, formatDate, formatNumber, t, locale, currency: userCurrency } = useUser();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { enabled: screenshotImportEnabled } = useFeatureFlag('screenshot_import');
  const { enabled: statementImportEnabled } = useFeatureFlag('statement_import');
  // "View them" after a statement import. Read straight from the URL (not useUrlState) so it is
  // never restored from session storage later, when the import may no longer exist.
  const importBatchId = searchParams.get('import') ?? '';

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

  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);

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
    import_batch_id: importBatchId || undefined,
    // Picked months are disjoint spans that can cross a year (Nov + Dec + Jan), which no
    // single range expresses — so when any are picked they are the whole date filter and
    // the year bounds drop out. The Year select only scopes the unfiltered case.
    // An import usually spans more than the selected year, so it replaces the date filter too.
    start_date: selectedMonths.length || importBatchId ? undefined : `${yearFilter}-01-01`,
    end_date: selectedMonths.length || importBatchId ? undefined : `${yearFilter}-12-31`,
    months: selectedMonths.length && !importBatchId ? selectedMonths.join(',') : undefined,
  };

  // The year counts as a filter once it leaves its default: it now lives behind "More", so a
  // changed year has to be visible (and resettable) from the bar.
  const anyFilterActive = Boolean(
    categoryFilter !== 'all' || accountFilter !== 'all' || fundFilter !== 'all' || typeFilter !== 'all' ||
    tagFilter !== 'all' || monthFilter !== 'all' || minAmount || maxAmount || searchQuery || importBatchId ||
    yearFilter !== new Date().getFullYear().toString(),
  );

  // The total mixes transactions from accounts in different currencies, so the backend
  // converts everything into the user's currency before summing. Always fetched: its count
  // is also the number next to the page title.
  const { data: summaryData } = useQuery({
    queryKey: ['transactions-summary', commonFilterParams, userCurrency],
    queryFn: () => transactionsApi.getSummary({ ...commonFilterParams, base_currency: userCurrency }),
    placeholderData: keepPreviousData,
  });

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
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
      importBatch: importBatchId,
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

  // The mobile dock's Add button and the global `N` shortcut navigate here with
  // `{ openAdd: true }` location state; consume it once so a reload doesn't reopen the dialog.
  useEffect(() => {
    const state = location.state as OpenAddState | null;
    if (!state?.openAdd) return;
    setIsCreateModalOpen(true);
    // Clear only the history state: navigating here would race useUrlState restoring saved filters.
    window.history.replaceState({ ...(window.history.state as object | null), usr: null }, '');
  }, [location]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // Set when the edit dialog was opened from an auto-post notification: saving the edit also
  // dismisses that notification (the user has reviewed it).
  const [ackPostingId, setAckPostingId] = useState<string | null>(null);
  // Copy prefills the create form from an existing row; it only changes the modal's wording,
  // the submit path stays the create one (selectedTransaction is left null on purpose).
  const [isCopy, setIsCopy] = useState(false);
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [transferDestAmount, setTransferDestAmount] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    category_id_fk: '',
    account_id_fk: '',
    savings_fund_id_fk: '',
    tags: [],
  });

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
    categoryFilter, accountFilter, fundFilter, typeFilter, tagFilter, importBatchId,
    yearFilter, monthFilter, debouncedSearch, debouncedMin, debouncedMax,
  ]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      invalidateTransactionData(queryClient);
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
      invalidateTransactionData(queryClient);
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
      if (ackPostingId) {
        recurringApi.ackNotification(ackPostingId)
          .catch(() => undefined) // Best effort: an undismissed notice just expires on its own.
          .finally(() => queryClient.invalidateQueries({ queryKey: RECURRING_NOTIFICATIONS_KEY }));
      }
      invalidateTransactionData(queryClient);
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
      invalidateTransactionData(queryClient);
      toast({ title: t('pages.transactions.transferCompleted') });
      closeModal();
    },
    onError: (err: Error | ApiError) => {
      // One leg may have landed — refetch so the list reflects whatever actually posted.
      invalidateTransactionData(queryClient);

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

  // "Edit" on an auto-post notification (bell / Recurring page) navigates here with the
  // transaction in location state. Wait for categories so openEditModal can tell a fund
  // withdrawal apart, then consume the state once so a reload doesn't reopen the dialog.
  const consumedEditKey = useRef<string | null>(null);
  useEffect(() => {
    const state = location.state as OpenEditState | null;
    if (!state?.editTransaction || categories.length === 0) return;
    // replaceState below doesn't update router `location`, so guard against re-opening when
    // categories refetch with a different length.
    if (consumedEditKey.current === location.key) return;
    consumedEditKey.current = location.key;
    openEditModal(state.editTransaction);
    setAckPostingId(state.ackPostingId ?? null);
    window.history.replaceState({ ...(window.history.state as object | null), usr: null }, '');
  }, [location, categories.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setAckPostingId(null);
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


  const handleRetry = () => {
    refetchTransactions();
    queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
  };

  return (
    <div className="space-y-6">
      {/* Header: title with the count for the current filter, then the actions. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
            {t('pages.transactions.title')}
          </h1>
          {/* Count and total for the current filter. Always shown, so changing a filter
              updates the numbers in place instead of adding or removing a line. */}
          {summaryData && (
            <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {t(transactionCountKey(locale, summaryData.count), { count: formatNumber(summaryData.count) })}
              <span aria-hidden="true"> · </span>
              {t('pages.transactions.summaryTotal')}{' '}
              <span className="text-foreground">
                <SensitiveValue>{formatCurrency(summaryData.total_amount)}</SensitiveValue>
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {screenshotImportEnabled && (
            <Button asChild variant="outline" className="h-11 px-4">
              <Link to="/dashboard/import/screenshot">
                <ScanLine aria-hidden="true" />
                {t('pages.transactions.importScreenshot')}
              </Link>
            </Button>
          )}
          {/* The mobile dock carries Add below the desktop breakpoint. */}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            aria-keyshortcuts="n"
            className="hidden h-11 px-[1.125rem] lg:inline-flex"
          >
            <Plus aria-hidden="true" />
            {t('pages.transactions.add')}
            <kbd
              aria-hidden="true"
              className="rounded-[0.3125rem] border border-primary-foreground/35 px-1.5 text-[0.6875rem] font-medium leading-[1.125rem]"
            >
              N
            </kbd>
          </Button>
        </div>
      </div>

      <TransactionFilters
        categories={categories}
        accounts={accounts}
        funds={funds}
        tags={tags}
        years={years}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        accountFilter={accountFilter}
        setAccountFilter={setAccountFilter}
        fundFilter={fundFilter}
        setFundFilter={setFundFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        maxAmount={maxAmount}
        setMaxAmount={setMaxAmount}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        selectedMonths={selectedMonths}
        anyFilterActive={anyFilterActive}
        onReset={clearFilters}
      />

      {importBatchId && (
        <p className="flex flex-wrap items-center gap-x-3 text-[0.8125rem] text-muted-foreground">
          {t('pages.transactions.importFilterActive')}
          <button
            type="button"
            onClick={() => setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('import');
              return next;
            })}
            className="inline-flex items-center gap-1 rounded-sm text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pages.transactions.importFilterClear')}
          </button>
        </p>
      )}

      <TransactionList
        transactions={transactions}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        categoryMap={categoryMap}
        accountMap={accountMap}
        fundMap={fundMap}
        page={page}
        setPage={setPage}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        hasNextPage={hasNextPage}
        onAdd={() => setIsCreateModalOpen(true)}
        showImportLink={statementImportEnabled && !anyFilterActive}
        onEdit={openEditModal}
        onCopy={openCopyModal}
        onDelete={handleDelete}
      />

      <TransactionDialog
        open={isCreateModalOpen || !!selectedTransaction}
        onClose={closeModal}
        selectedTransaction={selectedTransaction}
        isCopy={isCopy}
        mode={mode}
        changeMode={changeMode}
        formData={formData}
        setFormData={setFormData}
        transferToAccountId={transferToAccountId}
        setTransferToAccountId={setTransferToAccountId}
        transferDestAmount={transferDestAmount}
        setTransferDestAmount={setTransferDestAmount}
        errors={formErrors}
        clearError={clearFormError}
        submitError={submitError}
        isSaving={isSaving}
        onSubmit={handleSubmit}
        categories={categories}
        accounts={accounts}
        accountMap={accountMap}
        funds={funds}
        tags={tags}
        onManageTags={() => setIsManageTagsOpen(true)}
      />

      <ManageTagsDialog
        open={isManageTagsOpen}
        onOpenChange={setIsManageTagsOpen}
        tags={tags}
        onTagDeleted={tagId => setFormData(prev => ({ ...prev, tags: prev.tags.filter(id => id !== tagId) }))}
      />

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
              <div className="border-y border-border py-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pendingDelete.notes || category?.category_name || t('common.unknown')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(pendingDelete.date)} · {category?.category_name || t('common.unknown')} · {account?.account_name || t('common.unknown')}
                    </p>
                  </div>
                  <SensitiveValue className="shrink-0 font-medium tabular-nums">
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
    </div>
  );
}
