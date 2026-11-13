import { useId, useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Info, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { fieldAria, useFormErrors } from '@/hooks/use-form-errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getErrorMessage } from '@/lib/api/client';
import { accountsApi, accountGroupsApi, netWorthApi } from '@/lib/api/endpoints';
import { Account, AccountGroup, CreateAccountRequest, UpdateAccountRequest } from '@/lib/api/types';
import { markOptimistic, optimisticList, patchById, tempUuid, withoutId } from '@/lib/optimistic';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { useUser } from '@/contexts/user-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { cn } from '@/lib/utils';
import { AccountGroupSection } from './accounts/AccountGroupSection';
import { AccountRow } from './accounts/AccountRow';
import { AccountsSkeleton } from './accounts/AccountsSkeleton';
import { NetWorthChart } from './accounts/NetWorthChart';
import {
  getDateRange,
  NET_WORTH_RANGES,
  pluralKey,
  sortAccounts,
  sumBase,
  type NetWorthRange,
} from './accounts/helpers';

const ACCOUNT_TYPES = ['cash', 'checking', 'credit', 'investment', 'savings'];
const CURRENCIES = ['AUD', 'CAD', 'CZK', 'EUR', 'GBP', 'PLN', 'USD'];

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { locale, t, currency: userCurrency, formatCurrency, formatCurrencyCompact, formatNumber } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const [netWorthRange, setNetWorthRange] = useState<NetWorthRange>('90d');
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const inactiveId = useId();

  const { start: nwStart, end: nwEnd } = getDateRange(netWorthRange);
  const {
    data: netWorthData,
    isLoading: netWorthLoading,
    isPlaceholderData: netWorthSwitching,
  } = useQuery({
    queryKey: ['net-worth', netWorthRange, userCurrency],
    queryFn: async () => {
      const res = await netWorthApi.getTimeline({
        ...(nwStart ? { start_date: nwStart } : {}),
        end_date: nwEnd,
        base_currency: userCurrency,
      });
      return res.data;
    },
    // Switching the range keeps the current line (dimmed) until the new one arrives, so the
    // figure and chart never collapse into a loading state and back.
    placeholderData: keepPreviousData,
  });

  const netWorthDates = netWorthData?.dates ?? [];
  const netWorthValues = netWorthData?.net_worth ?? [];

  const { data: accounts = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['accounts', userCurrency],
    queryFn: async () => {
      const response = await accountsApi.getAll({ base_currency: userCurrency });
      return response.data;
    },
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['account-groups'],
    queryFn: async () => {
      const response = await accountGroupsApi.getAll();
      return response.data;
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    account_name: '',
    type: '',
    currency: 'CZK',
  });
  // Select value for the group field. Either 'none', an existing group's id, or the 'new'
  // sentinel — the last reveals newGroupName below instead of resolving to an id directly.
  const [groupSelection, setGroupSelection] = useState<string>('none');
  const [newGroupName, setNewGroupName] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameGroup, setRenameGroup] = useState<AccountGroup | null>(null);
  const [renameGroupName, setRenameGroupName] = useState('');
  const [deleteGroupConfirmId, setDeleteGroupConfirmId] = useState<string | null>(null);

  const [renameGroupError, setRenameGroupError] = useState<string | undefined>(undefined);

  const activeAccounts = accounts.filter(a => a.account_is_active !== false);
  const inactiveAccounts = sortAccounts(accounts.filter(a => a.account_is_active === false), userCurrency);
  const groupIds = new Set(groups.map(g => g.account_groups_id_pk));
  const groupSections = groups
    .slice()
    .sort((a, b) => a.group_name.localeCompare(b.group_name))
    .map(group => ({
      group,
      members: sortAccounts(
        activeAccounts.filter(a => a.account_group_id_fk === group.account_groups_id_pk),
        userCurrency,
      ),
    }))
    .filter(g => g.members.length > 0);
  // An account pointing at a group that is not in the list (deleted, or still loading) is
  // shown with the ungrouped ones rather than vanishing.
  const otherAccounts = sortAccounts(
    activeAccounts.filter(a => !a.account_group_id_fk || !groupIds.has(a.account_group_id_fk)),
    userCurrency,
  );

  const accountTypeLabel = (type: string) => ({
    cash: t('types.cash'),
    checking: t('types.checking'),
    credit: t('types.credit'),
    investment: t('types.investment'),
    savings: t('types.savings'),
  }[type] ?? type);

  const groupCaption = (members: Account[]) => {
    const count = new Set(members.map(a => a.currency || userCurrency)).size;
    return t(pluralKey(locale, count, 'pages.accounts.groupCaption'), { count: formatNumber(count) });
  };

  const groupTotals = (members: Account[]) => {
    const balance = sumBase(members, a => a.current_balance_base);
    const flow = sumBase(members, a => a.net_flow_mtd_base);
    return { total: balance.total, flow: flow.total, skipped: Math.max(balance.skipped, flow.skipped) };
  };

  const renderRows = (list: Account[]) =>
    list.map(account => (
      <AccountRow
        key={account.accounts_id_pk}
        account={account}
        typeLabel={accountTypeLabel(account.type)}
        onEdit={openEditModal}
        onDelete={setDeleteConfirmId}
        onActivate={(id) => updateMutation.mutate({ id, data: { account_is_active: true } })}
      />
    ));


  // Accounts are conditionally soft-deleted server-side (kept, account_is_active = false) when
  // transactions reference them. Dropping the row is correct for the active list either way;
  // a soft-deleted account simply reappears under "inactive" once the refetch lands.
  const optimisticDelete = optimisticList<Account, string>(
    queryClient,
    ['accounts', userCurrency],
    (prev, id) => withoutId(prev, 'accounts_id_pk', id)
  );

  const optimisticCreate = optimisticList<Account, CreateAccountRequest>(
    queryClient,
    ['accounts', userCurrency],
    (prev, payload) => [
      ...prev,
      markOptimistic<Account>({
        accounts_id_pk: tempUuid(),
        user_id_fk: null,
        account_name: payload.account_name,
        type: payload.type,
        currency: payload.currency ?? userCurrency,
        account_is_active: true,
        account_group_id_fk: payload.account_group_id_fk ?? null,
        current_balance: payload.current_balance ?? 0,
        current_balance_base: payload.current_balance ?? 0,
        net_flow_mtd: 0,
        net_flow_mtd_base: 0,
        history_30d: [],
        created_at: null,
      }),
    ]
  );

  const optimisticUpdate = optimisticList<Account, { id: string; data: UpdateAccountRequest }>(
    queryClient,
    ['accounts', userCurrency],
    (prev, vars) => patchById(prev, 'accounts_id_pk', vars.id, vars.data)
  );

  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onMutate: (accountId: string) => {
      // Close the confirm dialog alongside the optimistic removal rather than after the
      // round-trip, so the whole interaction resolves in one frame.
      setDeleteConfirmId(null);
      return optimisticDelete.onMutate(accountId);
    },
    onSuccess: () => {
      toast({
        title: t('pages.accounts.deleted'),
        description: t('pages.accounts.deletedDescription'),
      });
    },
    onError: (err, _accountId, context) => {
      optimisticDelete.rollback(context);
      const message = getErrorMessage(err, t('pages.accounts.deleteFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticDelete.onSettled,
  });

  const handleDelete = (accountId: string) => {
    deleteMutation.mutate(accountId);
  };

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onMutate: optimisticCreate.onMutate,
    onSuccess: () => {
      toast({ title: t('pages.accounts.created') });
    },
    onError: (err, _payload, context) => {
      optimisticCreate.rollback(context);
      const message = getErrorMessage(err, t('pages.accounts.createFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticCreate.onSettled,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; data: UpdateAccountRequest }) => accountsApi.update(data.id, data.data),
    onMutate: optimisticUpdate.onMutate,
    onSuccess: () => {
      toast({ title: t('pages.accounts.updated') });
    },
    onError: (err, _vars, context) => {
      optimisticUpdate.rollback(context);
      const message = getErrorMessage(err, t('pages.accounts.updateFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticUpdate.onSettled,
  });

  const createGroupMutation = useMutation({
    mutationFn: accountGroupsApi.create,
    onSuccess: () => {
      toast({ title: t('pages.accounts.groupCreated') });
      void queryClient.invalidateQueries({ queryKey: ['account-groups'] });
    },
    onError: (err) => {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('pages.accounts.groupCreateFailed')),
        variant: 'destructive',
      });
    },
  });

  const renameGroupMutation = useMutation({
    mutationFn: (vars: { id: string; group_name: string }) => accountGroupsApi.update(vars.id, { group_name: vars.group_name }),
    onSuccess: () => {
      toast({ title: t('pages.accounts.groupRenamed') });
      void queryClient.invalidateQueries({ queryKey: ['account-groups'] });
    },
    onError: (err) => {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('pages.accounts.groupRenameFailed')),
        variant: 'destructive',
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: accountGroupsApi.delete,
    onSuccess: () => {
      toast({ title: t('pages.accounts.groupDeleted') });
      void queryClient.invalidateQueries({ queryKey: ['account-groups'] });
      // Members are un-grouped server-side (ON DELETE SET NULL) -- refetch so their cards
      // move back into the native/foreign sections instead of vanishing with the group.
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err) => {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('pages.accounts.groupDeleteFailed')),
        variant: 'destructive',
      });
    },
  });

  const { errors: formErrors, show: showFormErrors, clear: clearFormError, reset: resetFormErrors } = useFormErrors<'name' | 'type' | 'group'>();

  const handleSubmit = async () => {
    const fieldErrors: { name?: string; type?: string; group?: string } = {};
    if (!formData.account_name.trim()) fieldErrors.name = t('pages.accounts.nameRequired');
    if (!formData.type) fieldErrors.type = t('pages.accounts.typeRequired');
    if (groupSelection === 'new' && !newGroupName.trim()) fieldErrors.group = t('pages.accounts.groupNameRequired');
    if (!showFormErrors(fieldErrors)) return;

    // A brand-new group must exist before the account can reference it, so this one path
    // waits for the round-trip instead of closing on the optimistic write like the rest.
    let account_group_id_fk: string | null = groupSelection === 'none' ? null : groupSelection;
    if (groupSelection === 'new') {
      try {
        const created = await createGroupMutation.mutateAsync({ group_name: newGroupName.trim() });
        account_group_id_fk = created.data?.account_groups_id_pk ?? null;
      } catch {
        return; // createGroupMutation already toasted the failure
      }
    }

    const payload = { ...formData, account_group_id_fk };

    if (selectedAccount) {
      updateMutation.mutate({ id: selectedAccount.accounts_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }

    // The optimistic write already landed in the cache, so the modal can close immediately
    // instead of holding a spinner for the round-trip.
    closeModal();
  };

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      account_name: account.account_name,
      type: account.type,
      currency: account.currency || 'CZK',
    });
    setGroupSelection(account.account_group_id_fk ?? 'none');
    setNewGroupName('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetFormErrors();
    setSelectedAccount(null);
    setFormData({
      account_name: '',
      type: '',
      currency: 'CZK',
    });
    setGroupSelection('none');
    setNewGroupName('');
  };

  const openRenameGroup = (group: AccountGroup) => {
    setRenameGroup(group);
    setRenameGroupName(group.group_name);
    setRenameGroupError(undefined);
  };

  const handleRenameGroup = () => {
    if (!renameGroup) return;
    if (!renameGroupName.trim()) {
      setRenameGroupError(t('pages.accounts.renameRequired'));
      return;
    }
    renameGroupMutation.mutate({ id: renameGroup.account_groups_id_pk, group_name: renameGroupName.trim() });
    setRenameGroup(null);
    setRenameGroupName('');
    setRenameGroupError(undefined);
  };


  const netWorthPeriod = t(`pages.netWorth.period${netWorthRange}` as 'pages.netWorth.period30d');
  const netWorthEnd = netWorthValues.length > 0 ? netWorthValues[netWorthValues.length - 1] : 0;
  // Amounts stay out of the accessible name while amounts are hidden.
  const netWorthAria = isPrivacyMode || netWorthValues.length === 0
    ? t('pages.netWorth.chartAria', { period: netWorthPeriod })
    : t('pages.netWorth.chartAriaDetail', { period: netWorthPeriod, amount: formatCurrency(netWorthEnd) });

  const activeCount = activeAccounts.length;

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
          {t('pages.accounts.title')}
        </h1>
        {!isLoading && !error && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {t(pluralKey(locale, activeCount, 'pages.accounts.active'), { count: formatNumber(activeCount) })}
          </span>
        )}
      </div>
      <Button variant="outline" onClick={() => setIsModalOpen(true)} className="h-11 px-4">
        <Plus aria-hidden="true" />
        {t('pages.accounts.add')}
      </Button>
    </header>
  );

  // ---- Summary: net worth first, then this month's flow and (if synced) investments --------------
  const money = (value: number) => formatMoneyWhole(value, userCurrency);
  const parts = (value: number) => formatMoneyParts(value, userCurrency, 0);
  // The timeline's last point is today's net worth; until it loads the account balances stand in.
  const netWorthNow =
    netWorthValues.length > 0 ? netWorthEnd : (sumBase(activeAccounts, a => a.current_balance_base).total ?? 0);
  const rawChange = netWorthValues.length > 1 ? netWorthEnd - netWorthValues[0] : 0;
  // Whole amounts are shown, so anything under half a unit is no change (no "+0", no green zero).
  const netWorthChange = Math.abs(rawChange) < 0.5 ? 0 : rawChange;
  const investments = netWorthData?.investments;

  const summaryMetrics: Metric[] = [
    {
      key: 'netWorth',
      label: t('pages.netWorth.title'),
      value: netWorthNow,
      parts: parts(netWorthNow),
      loading: netWorthLoading,
      note: t(pluralKey(locale, activeCount, 'pages.accounts.across'), { count: formatNumber(activeCount) }),
    },
    {
      // Follows the range picked above the chart.
      key: 'change',
      label: t('pages.netWorth.change'),
      value: netWorthChange,
      parts: parts(netWorthChange),
      signed: true,
      loading: netWorthLoading,
      note: netWorthPeriod,
    },
    ...(investments
      ? [
          {
            key: 'invested',
            label: t('pages.accounts.invested'),
            value: investments.total_value,
            parts: parts(investments.total_value),
            note: investments.is_stale ? t('pages.netWorth.investedStale') : t('pages.accounts.investedHint'),
          },
        ]
      : []),
  ];

  const summary = (
    <section aria-label={t('pages.netWorth.title')} className="mt-8 lg:mt-10">
      <MetricGrid
        metrics={summaryMetrics}
        size="lg"
        className={investments ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}
        formatAmount={money}
      />

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h2 className="text-[0.8125rem] font-normal text-muted-foreground">{t('pages.netWorth.overTime')}</h2>
        <div role="group" aria-label={t('pages.netWorth.rangeLabel')} className="flex gap-4 text-[0.8125rem]">
          {NET_WORTH_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={netWorthRange === r}
              onClick={() => setNetWorthRange(r)}
              className={cn(
                'border-b-2 pb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                netWorthRange === r
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`pages.netWorth.range${r.charAt(0).toUpperCase() + r.slice(1)}` as 'pages.netWorth.range30d')}
            </button>
          ))}
        </div>
      </div>
      {/* Fixed height in every state, so switching range or loading never moves the page. */}
      <div className="mt-2 h-[13.125rem]">
        {netWorthValues.length > 0 ? (
          <div className={cn('transition-opacity', netWorthSwitching && 'opacity-50')} aria-busy={netWorthSwitching}>
            <NetWorthChart
              dates={netWorthDates}
              values={netWorthValues}
              locale={locale}
              formatAxis={formatCurrencyCompact}
              formatValue={formatCurrency}
              name={t('pages.netWorth.title')}
              ariaLabel={netWorthAria}
            />
          </div>
        ) : netWorthLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <p className="flex h-full items-center justify-center text-[0.8125rem] text-muted-foreground">
            {t('pages.netWorth.noData')}
          </p>
        )}
      </div>
    </section>
  );
  const showSummary = !isLoading && !groupsLoading && accounts.length > 0;

  let body;
  if (isLoading || groupsLoading) {
    body = <AccountsSkeleton />;
  } else if (error && accounts.length === 0) {
    body = (
      <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <div>
          <p className="font-medium">{t('pages.accounts.failedToLoad')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : t('common.unknownError')}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {t('common.retry')}
        </Button>
      </div>
    );
  } else if (activeAccounts.length === 0 && inactiveAccounts.length === 0) {
    body = (
      <EmptyState
        icon={<Wallet className="h-8 w-8 text-muted-foreground" />}
        title={t('pages.accounts.noActiveTitle')}
        description={t('pages.accounts.noActiveDescription')}
        action={{
          label: t('pages.accounts.addFirst'),
          onClick: () => setIsModalOpen(true),
        }}
      />
    );
  } else {
    body = (
      <>
        {activeAccounts.length === 0 && (
          <EmptyState
            icon={<Wallet className="h-8 w-8 text-muted-foreground" />}
            title={t('pages.accounts.noActiveTitle')}
            description={t('pages.accounts.noActiveDescription')}
            action={{
              label: t('pages.accounts.addFirst'),
              onClick: () => setIsModalOpen(true),
            }}
          />
        )}
        {groupSections.map(({ group, members }) => (
          <AccountGroupSection
            key={group.account_groups_id_pk}
            title={group.group_name}
            caption={groupCaption(members)}
            total={groupTotals(members).total}
            flow={groupTotals(members).flow}
            skipped={groupTotals(members).skipped}
            group={group}
            onRename={openRenameGroup}
            onDelete={setDeleteGroupConfirmId}
          >
            {renderRows(members)}
          </AccountGroupSection>
        ))}
        {otherAccounts.length > 0 && (
          <AccountGroupSection
            title={groupSections.length > 0 ? t('pages.accounts.otherAccounts') : t('pages.accounts.allAccounts')}
            caption={groupSections.length > 0 ? t('pages.accounts.notInGroup') : undefined}
            total={groupTotals(otherAccounts).total}
            flow={groupTotals(otherAccounts).flow}
            skipped={groupTotals(otherAccounts).skipped}
          >
            {renderRows(otherAccounts)}
          </AccountGroupSection>
        )}
        {inactiveAccounts.length > 0 && (
          <section className="mt-14">
            <h2 className="border-t border-foreground/30">
              <button
                type="button"
                aria-expanded={inactiveOpen}
                aria-controls={inactiveId}
                onClick={() => setInactiveOpen((open) => !open)}
                className="flex w-full items-center gap-2 py-3 text-left text-[0.8125rem] font-normal text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('pages.accounts.inactiveAccounts')} ({inactiveAccounts.length})
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform', inactiveOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
            </h2>
            {inactiveOpen && <ul id={inactiveId}>{renderRows(inactiveAccounts)}</ul>}
          </section>
        )}
      </>
    );
  }

  return (
    <div>
      {header}
      {showSummary && summary}
      <div className="mt-12 lg:mt-14">{body}</div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? t('pages.accounts.editTitle') : t('pages.accounts.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-5 py-4">
              <Field htmlFor="account_name" label={t('pages.accounts.accountName')} error={formErrors.name}>
                <Input
                  id="account_name"
                  placeholder={t('pages.accounts.accountNamePlaceholder')}
                  value={formData.account_name}
                  onChange={(e) => {
                    setFormData({ ...formData, account_name: e.target.value });
                    clearFormError('name');
                  }}
                  {...fieldAria('account_name', formErrors.name)}
                />
              </Field>
              <Field htmlFor="type" label={t('pages.accounts.accountType')} error={formErrors.type}>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, type: value });
                    clearFormError('type');
                  }}
                >
                  <SelectTrigger id="type" {...fieldAria('type', formErrors.type)}>
                    <SelectValue placeholder={t('common.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {accountTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field htmlFor="currency" label={t('common.currency')}>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder={t('profile.selectCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                htmlFor="account_group"
                label={t('pages.accounts.group')}
                labelAction={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={t('pages.accounts.groupHelp')}
                        className="text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>{t('pages.accounts.groupHelp')}</p>
                    </TooltipContent>
                  </Tooltip>
                }
              >
                <Select value={groupSelection} onValueChange={setGroupSelection}>
                  <SelectTrigger id="account_group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('pages.accounts.noGroup')}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.account_groups_id_pk} value={group.account_groups_id_pk}>
                        {group.group_name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">{t('pages.accounts.newGroup')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {groupSelection === 'new' && (
                <Field htmlFor="new_group_name" label={t('pages.accounts.newGroupName')} error={formErrors.group}>
                  <Input
                    id="new_group_name"
                    placeholder={t('pages.accounts.groupNamePlaceholder')}
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value);
                      clearFormError('group');
                    }}
                    {...fieldAria('new_group_name', formErrors.group)}
                  />
                </Field>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                {t('common.cancel')}
              </Button>
              {/* The write is optimistic and the modal closes on click, so no pending gate is
                  needed here — gating on isPending would only block a quick second create. */}
              <Button type="submit">
                {selectedAccount ? t('common.save') : t('pages.accounts.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pages.accounts.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            {t('pages.accounts.deleteDescription')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Group Dialog */}
      <Dialog
        open={renameGroup !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameGroup(null);
            setRenameGroupError(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pages.accounts.renameGroup')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Field htmlFor="rename_group_name" label={t('pages.accounts.groupName')} error={renameGroupError}>
              <Input
                id="rename_group_name"
                value={renameGroupName}
                onChange={(e) => {
                  setRenameGroupName(e.target.value);
                  setRenameGroupError(undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRenameGroup();
                  }
                }}
                placeholder={t('pages.accounts.groupNamePlaceholder')}
                {...fieldAria('rename_group_name', renameGroupError)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameGroup(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRenameGroup}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <Dialog open={deleteGroupConfirmId !== null} onOpenChange={() => setDeleteGroupConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pages.accounts.deleteGroupTitle')}</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            {t('pages.accounts.deleteGroupDescription')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteGroupConfirmId !== null) deleteGroupMutation.mutate(deleteGroupConfirmId);
                setDeleteGroupConfirmId(null);
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
