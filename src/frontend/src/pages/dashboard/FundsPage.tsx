import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field } from '@/components/ui/field';
import { fieldAria, useFormErrors } from '@/hooks/use-form-errors';
import { Input } from '@/components/ui/input';
import { tokenManager, ApiError, getErrorMessage } from '@/lib/api/client';
import { fundsApi } from '@/lib/api/endpoints';
import { SavingsFund, CreateSavingsFundRequest, UpdateSavingsFundRequest } from '@/lib/api/types';
import { markOptimistic, optimisticList, patchById, tempUuid, withoutId } from '@/lib/optimistic';
import { formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { EmptyState } from '@/components/ui/empty-state';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { RowList } from '@/components/data/RowList';
import { FundRow } from './funds/FundRow';
import { FundsSkeleton } from './funds/FundsSkeleton';
import {
  FUND_SORT_KEYS,
  FUND_SORT_LABELS,
  FUND_SORT_STORAGE_KEY,
  countKey,
  hasTarget,
  isZero,
  progressOf,
  readStoredSort,
  savedOf,
  sortFunds,
  type FundSortKey,
} from './funds/helpers';

export default function FundsPage() {
  const { formatNumber, t, locale, currency } = useUser();
  const queryClient = useQueryClient();

  const { data: funds = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => {
      const response = await fundsApi.getAll();
      return response.data;
    },
  });

  const [sortKey, setSortKey] = useState<FundSortKey>(readStoredSort);

  const handleSortChange = (value: FundSortKey) => {
    setSortKey(value);
    localStorage.setItem(FUND_SORT_STORAGE_KEY, value);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<SavingsFund | null>(null);

  const [formData, setFormData] = useState({
    fund_name: '',
    target_amount: '',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activeFunds = sortFunds(funds.filter(f => f.fund_is_active !== false), sortKey);
  const inactiveFunds = sortFunds(funds.filter(f => f.fund_is_active === false), sortKey);
  const totalCurrent = activeFunds.reduce((sum, f) => sum + savedOf(f), 0);
  const totalFlow = activeFunds.reduce((sum, f) => sum + (f.net_flow_30d || 0), 0);
  // A target of 0 means "no target"; those funds stay out of the target and progress figures.
  const targetedFunds = activeFunds.filter(hasTarget);
  const totalTarget = targetedFunds.reduce((sum, f) => sum + f.target_amount, 0);
  const totalCurrentTargeted = targetedFunds.reduce((sum, f) => sum + savedOf(f), 0);
  const deleteTarget = funds.find(f => f.savings_funds_id_pk === deleteConfirmId) ?? null;

  const handleOpenModal = (fund?: SavingsFund) => {
    if (fund) {
      setSelectedFund(fund);
      setFormData({
        fund_name: fund.fund_name,
        target_amount: fund.target_amount.toString(),
      });
    } else {
      setSelectedFund(null);
      setFormData({
        fund_name: '',
        target_amount: '',
      });
    }
    setIsModalOpen(true);
  };

  const { errors: formErrors, show: showFormErrors, clear: clearFormError, reset: resetFormErrors } = useFormErrors<'name' | 'target'>();

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetFormErrors();
    setSelectedFund(null);
    setFormData({
      fund_name: '',
      target_amount: '',
    });
  };

  const optimisticCreate = optimisticList<SavingsFund, CreateSavingsFundRequest & { user_id_fk: string }>(
    queryClient,
    ['funds'],
    (prev, payload) => [
      ...prev,
      markOptimistic<SavingsFund>({
        savings_funds_id_pk: tempUuid(),
        user_id_fk: payload.user_id_fk,
        fund_name: payload.fund_name,
        target_amount: payload.target_amount,
        fund_is_active: true,
        current_amount: 0,
        net_flow_30d: 0,
        created_at: null,
      }),
    ]
  );

  const optimisticUpdate = optimisticList<SavingsFund, { id: string; data: UpdateSavingsFundRequest }>(
    queryClient,
    ['funds'],
    (prev, vars) => patchById(prev, 'savings_funds_id_pk', vars.id, vars.data)
  );

  // Funds are conditionally soft-deleted server-side (fund_is_active = false) when transactions
  // reference them; dropping the row is right for the active list in both branches.
  const optimisticDelete = optimisticList<SavingsFund, string>(
    queryClient,
    ['funds'],
    (prev, id) => withoutId(prev, 'savings_funds_id_pk', id)
  );

  const createMutation = useMutation({
    mutationFn: fundsApi.create,
    onMutate: optimisticCreate.onMutate,
    onSuccess: () => {
      toast({ title: t('pages.funds.created') });
    },
    onError: (err: Error | ApiError, _payload, context) => {
      optimisticCreate.rollback(context);
      const message = getErrorMessage(err, t('pages.funds.createFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticCreate.onSettled,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; data: UpdateSavingsFundRequest }) => fundsApi.update(data.id, data.data),
    onMutate: optimisticUpdate.onMutate,
    onSuccess: () => {
      toast({ title: t('pages.funds.updated') });
    },
    onError: (err: Error | ApiError, _vars, context) => {
      optimisticUpdate.rollback(context);
      const message = getErrorMessage(err, t('pages.funds.updateFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticUpdate.onSettled,
  });

  const handleSubmit = async () => {
    const target = Number(formData.target_amount);
    const fieldErrors: { name?: string; target?: string } = {};
    if (!formData.fund_name.trim()) fieldErrors.name = t('pages.funds.nameRequired');
    if (!formData.target_amount) fieldErrors.target = t('pages.funds.targetRequired');
    else if (!Number.isFinite(target) || target < 0) fieldErrors.target = t('pages.funds.targetInvalid');
    // The backend types target_amount as an int, so a decimal would silently be truncated.
    else if (!Number.isInteger(target)) fieldErrors.target = t('pages.funds.targetWhole');
    if (!showFormErrors(fieldErrors)) return;

    const userId = tokenManager.getUserId();
    if (!userId) {
      toast({
        title: t('common.authenticationError'),
        description: t('pages.funds.userIdMissing'),
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      user_id_fk: userId,
      fund_name: formData.fund_name.trim(),
      target_amount: parseInt(formData.target_amount),
    };

    if (selectedFund) {
      updateMutation.mutate({ id: selectedFund.savings_funds_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }

    // Optimistic write is already in the cache — close rather than hold a spinner.
    handleCloseModal();
  };

  const deleteMutation = useMutation({
    mutationFn: fundsApi.delete,
    onMutate: (fundId: string) => {
      setDeleteConfirmId(null);
      return optimisticDelete.onMutate(fundId);
    },
    onSuccess: () => {
      toast({
        title: t('pages.funds.deleted'),
        description: t('pages.funds.deletedDescription'),
      });
    },
    onError: (err: Error | ApiError, _fundId, context) => {
      optimisticDelete.rollback(context);
      const message = getErrorMessage(err, t('pages.funds.deleteFailed'));
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticDelete.onSettled,
  });

  const header = (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 lg:mb-10">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
          {t('pages.funds.title')}
        </h1>
        <span className="hidden text-sm text-muted-foreground sm:inline">{t('pages.funds.description')}</span>
        <a
          href="/how-it-works#savings-funds"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-foreground underline decoration-foreground/30 underline-offset-4"
        >
          {t('pages.funds.guideLink')}
        </a>
      </div>
      <Button variant="outline" className="h-11 px-4" onClick={() => handleOpenModal()}>
        <Plus aria-hidden="true" />
        {t('pages.funds.create')}
      </Button>
    </div>
  );

  if (error && !isLoading && funds.length === 0) {
    return (
      <div>
        {header}
        <div role="alert" className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <AlertCircle className="mb-4 h-8 w-8 text-destructive" aria-hidden="true" />
          <h3 className="text-lg font-medium">{t('pages.funds.failedToLoad')}</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {error instanceof Error ? error.message : t('common.unknownError')}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const renderRows = (list: SavingsFund[]) => (
    <RowList>
      {list.map(fund => (
        <FundRow
          key={fund.savings_funds_id_pk}
          fund={fund}
          onEdit={handleOpenModal}
          onActivate={f => updateMutation.mutate({ id: f.savings_funds_id_pk, data: { fund_is_active: true } })}
          onDelete={f => setDeleteConfirmId(f.savings_funds_id_pk)}
        />
      ))}
    </RowList>
  );

  // ---- Summary: what is saved, how it moved in 30 days, and the goals ---------------------------
  const money = (value: number) => formatMoneyWhole(value, currency);
  const parts = (value: number) => formatMoneyParts(value, currency, 0);
  const change = isZero(totalFlow) ? 0 : totalFlow;
  const targetPercent =
    totalTarget > 0 ? formatNumber(totalCurrentTargeted / totalTarget, { style: 'percent', maximumFractionDigits: 0 }) : null;

  const summaryMetrics: Metric[] = [
    {
      key: 'saved',
      label: t('pages.funds.savedAcross'),
      value: totalCurrent,
      parts: parts(totalCurrent),
      note: t(countKey(locale, activeFunds.length, 'pages.funds.inFunds'), { count: formatNumber(activeFunds.length) }),
    },
    {
      key: 'flow',
      label: t('pages.funds.last30Days'),
      value: change,
      parts: parts(change),
      note: t('pages.funds.last30DaysHint'),
    },
    ...(targetedFunds.length > 0
      ? [
          {
            key: 'goals',
            label: t('pages.funds.goals'),
            value: totalTarget,
            parts: parts(totalTarget),
            note: t(countKey(locale, targetedFunds.length, 'pages.funds.goalsReached'), {
              percent: targetPercent ?? '',
              count: formatNumber(targetedFunds.length),
            }),
          },
        ]
      : []),
  ];

  // Funds grouped by where they stand, so the list has landmarks. The sort applies inside each group.
  const fundGroups = [
    { key: 'progress', title: t('pages.funds.groupInProgress'), funds: activeFunds.filter(f => hasTarget(f) && progressOf(f) < 100) },
    { key: 'reached', title: t('pages.funds.goalReached'), funds: activeFunds.filter(f => hasTarget(f) && progressOf(f) >= 100) },
    { key: 'none', title: t('pages.funds.noTarget'), funds: activeFunds.filter(f => !hasTarget(f)) },
  ].filter(group => group.funds.length > 0);

  return (
    <div>
      {header}

      {isLoading ? (
        <FundsSkeleton />
      ) : (
        <>
          {activeFunds.length === 0 ? (
            <EmptyState
              icon={<Target className="h-8 w-8 text-muted-foreground" />}
              title={t('pages.funds.noActiveTitle')}
              description={t('pages.funds.noActiveDescription')}
              action={{
                label: t('pages.funds.createFirst'),
                onClick: () => handleOpenModal(),
              }}
            />
          ) : (
            <>
              <section aria-label={t('pages.funds.savedAcross')} className="mt-8 lg:mt-10">
                <MetricGrid
                  metrics={summaryMetrics}
                  size="lg"
                  className={targetedFunds.length > 0 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}
                  formatAmount={money}
                />
              </section>

              <section className="mt-12 lg:mt-14">
                <div
                  role="group"
                  aria-label={t('pages.funds.sortBy')}
                  className="mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-1"
                >
                  <span className="text-[0.8125rem] text-muted-foreground/80">{t('pages.funds.sortBy')}</span>
                  {FUND_SORT_KEYS.map(key => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={sortKey === key}
                      onClick={() => handleSortChange(key)}
                      className={cn(
                        'rounded-sm py-1.5 text-[0.8125rem] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        sortKey === key ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span className={cn('border-b-2 pb-[0.1875rem]', sortKey === key ? 'border-primary' : 'border-transparent')}>
                        {t(FUND_SORT_LABELS[key])}
                      </span>
                    </button>
                  ))}
                </div>
                {fundGroups.map(group => (
                  <section key={group.key} aria-labelledby={`fund-group-${group.key}`} className="mt-10 first-of-type:mt-0">
                    <div className="flex items-baseline justify-between gap-4 border-b border-foreground/30 pb-3">
                      <h2 id={`fund-group-${group.key}`} className="text-[1.125rem] font-medium tracking-[-0.01em]">
                        {group.title}
                        <span className="ml-2.5 text-[0.8125rem] font-normal text-muted-foreground tabular-nums">
                          {formatNumber(group.funds.length)}
                        </span>
                      </h2>
                      <span className="whitespace-nowrap text-[1.25rem] tabular-nums tracking-[-0.02em]">
                        <span className="sr-only">{t('statement.total')}: </span>
                        <SensitiveValue>
                          {money(group.funds.reduce((sum, f) => sum + savedOf(f), 0))}
                        </SensitiveValue>
                      </span>
                    </div>
                    {renderRows(group.funds)}
                  </section>
                ))}
              </section>
            </>
          )}

          {inactiveFunds.length > 0 && (
            <Collapsible className="mt-10">
              <CollapsibleTrigger
                className={cn(
                  'group inline-flex items-center gap-1.5 rounded-sm py-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {t('pages.funds.inactiveFundsCount', { count: formatNumber(inactiveFunds.length) })}
                <ChevronDown
                  className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>{renderRows(inactiveFunds)}</CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedFund ? t('pages.funds.editTitle') : t('pages.funds.createTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {selectedFund ? t('pages.funds.editTitle') : t('pages.funds.createTitle')}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <Field htmlFor="name" label={t('pages.funds.fundName')} error={formErrors.name}>
                <Input
                  id="name"
                  placeholder={t('pages.funds.fundNamePlaceholder')}
                  value={formData.fund_name}
                  onChange={(e) => {
                    setFormData({ ...formData, fund_name: e.target.value });
                    clearFormError('name');
                  }}
                  {...fieldAria('name', formErrors.name)}
                />
              </Field>
              <Field
                htmlFor="target"
                label={t('pages.funds.targetAmount')}
                error={formErrors.target}
                hint={t('pages.funds.targetHint')}
              >
                <Input
                  id="target"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="5000"
                  value={formData.target_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, target_amount: e.target.value });
                    clearFormError('target');
                  }}
                  {...fieldAria('target', formErrors.target)}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                {t('common.cancel')}
              </Button>
              {/* Optimistic write + immediate close, so no pending gate is needed. */}
              <Button type="submit">
                {selectedFund ? t('common.save') : t('pages.funds.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pages.funds.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('pages.funds.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="flex items-baseline justify-between gap-4 border-y border-border py-3 text-sm">
              <p className="min-w-0 truncate font-medium">{deleteTarget.fund_name}</p>
              <SensitiveValue className="shrink-0 font-medium">{money(savedOf(deleteTarget))}</SensitiveValue>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
