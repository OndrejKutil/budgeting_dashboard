import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { fieldAria, useFormErrors } from '@/hooks/use-form-errors';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertCircle,
  Plus,
  Repeat,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  CalendarIcon,
} from 'lucide-react';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { cn } from '@/lib/utils';
import { fieldLine } from '@/components/ui/field-line';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { recurringApi, accountsApi, categoriesApi, fundsApi } from '@/lib/api/endpoints';
import type { Recurring, CreateRecurringRequest, RecurringResponse } from '@/lib/api/types';
import { isOptimistic, markOptimistic, optimisticQuery, patchById, tempUuid, withoutId } from '@/lib/optimistic';
import { useUser } from '@/contexts/user-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { AccountSelect } from '@/components/AccountSelect';
import { formatMoney, formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { daysDiff, toLocalDateString } from '@/lib/dates';

const DECIMAL_INPUT_PATTERN = '-?[0-9]*([.,][0-9]*)?';

function parseDecimalInput(value: string): number | null {
  const v = value.trim().replace(/\s/g, '');
  if (!v) return null;
  const lastComma = v.lastIndexOf(',');
  const lastDot = v.lastIndexOf('.');
  const sep = lastComma > lastDot ? ',' : lastDot >= 0 ? '.' : '';
  let normalized = v;
  if (sep) {
    const idx = sep === ',' ? lastComma : lastDot;
    normalized = `${v.slice(0, idx).replace(/[.,]/g, '')}.${v.slice(idx + 1).replace(/[.,]/g, '')}`;
  }
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

interface FormData {
  account_id_fk: string;
  category_id_fk: string;
  savings_fund_id_fk: string;
  amountRaw: string;
  cadence: string;
  next_date: Date | undefined;
  notes: string;
  is_active: boolean;
}

const EMPTY_FORM: FormData = {
  account_id_fk: '',
  category_id_fk: '',
  savings_fund_id_fk: '',
  amountRaw: '',
  cadence: 'monthly',
  next_date: undefined,
  notes: '',
  is_active: true,
};

export default function RecurringPage() {
  const { t, locale, formatDate, currency: userCurrency } = useUser();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Recurring | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: recurringData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['recurring', userCurrency],
    queryFn: async () => {
      const res = await recurringApi.getAll({ base_currency: userCurrency });
      return res;
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await accountsApi.getAll()).data || [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.getAll()).data || [],
  });

  const { data: funds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => (await fundsApi.getAll()).data || [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recurring'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['net-worth'] });
  };

  // Only the template list itself is written optimistically. The other four query families the
  // shared `invalidate()` touches (transactions, accounts, summary, net-worth) are derived
  // aggregates and stay pessimistic. The cached value here is the whole RecurringResponse, so
  // these go through optimisticQuery rather than optimisticList.
  const recurringKey = ['recurring', userCurrency];

  const optimisticCreate = optimisticQuery<RecurringResponse, CreateRecurringRequest>(
    queryClient,
    recurringKey,
    (prev, payload) => prev && {
      ...prev,
      count: prev.count + 1,
      data: [
        ...prev.data,
        markOptimistic<Recurring>({
          recurring_id_pk: tempUuid(),
          user_id_fk: null,
          account_id_fk: payload.account_id_fk,
          category_id_fk: payload.category_id_fk,
          savings_fund_id_fk: payload.savings_fund_id_fk ?? null,
          amount: payload.amount,
          cadence: payload.cadence as Recurring['cadence'],
          next_date: payload.next_date,
          notes: payload.notes ?? null,
          is_active: payload.is_active ?? true,
          created_at: null,
          updated_at: null,
        }),
      ],
    }
  );

  const optimisticUpdate = optimisticQuery<RecurringResponse, { id: string; data: CreateRecurringRequest }>(
    queryClient,
    recurringKey,
    (prev, vars) => prev && {
      ...prev,
      data: patchById(prev.data, 'recurring_id_pk', vars.id, vars.data as Partial<Recurring>),
    }
  );

  // Recurring templates are hard-deleted server-side, so removal is unconditional.
  const optimisticDelete = optimisticQuery<RecurringResponse, string>(
    queryClient,
    recurringKey,
    (prev, id) => prev && {
      ...prev,
      count: Math.max(0, prev.count - 1),
      data: withoutId(prev.data, 'recurring_id_pk', id),
    }
  );

  const createMutation = useMutation({
    mutationFn: recurringApi.create,
    onMutate: optimisticCreate.onMutate,
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.created') }); },
    onError: (err, _payload, context) => {
      optimisticCreate.rollback(context);
      toast({ title: t('common.error'), description: getErrorMessage(err, t('pages.recurring.createFailed')), variant: 'destructive' });
    },
    onSettled: optimisticCreate.onSettled,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateRecurringRequest }) => recurringApi.update(id, data),
    onMutate: optimisticUpdate.onMutate,
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.updated') }); },
    onError: (err, _vars, context) => {
      optimisticUpdate.rollback(context);
      toast({ title: t('common.error'), description: getErrorMessage(err, t('pages.recurring.updateFailed')), variant: 'destructive' });
    },
    onSettled: optimisticUpdate.onSettled,
  });

  const deleteMutation = useMutation({
    mutationFn: recurringApi.delete,
    onMutate: (recurringId: string) => {
      setDeleteConfirmId(null);
      return optimisticDelete.onMutate(recurringId);
    },
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.deleted'), description: t('pages.recurring.deletedDescription') }); },
    onError: (err, _recurringId, context) => {
      optimisticDelete.rollback(context);
      toast({ title: t('common.error'), description: getErrorMessage(err, t('pages.recurring.deleteFailed')), variant: 'destructive' });
    },
    onSettled: optimisticDelete.onSettled,
  });

  const postMutation = useMutation({
    mutationFn: recurringApi.post,
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.posted'), description: t('pages.recurring.postedDescription') }); },
    onError: (err) => toast({ title: t('common.error'), description: getErrorMessage(err, t('pages.recurring.postFailed')), variant: 'destructive' }),
  });

  const { errors: formErrors, show: showFormErrors, clear: clearFormError, reset: resetFormErrors } = useFormErrors<'amount' | 'account' | 'category' | 'nextDate'>();

  const closeModal = () => { setIsModalOpen(false); setSelected(null); setForm(EMPTY_FORM); setCalendarOpen(false); resetFormErrors(); };

  const openEdit = (r: Recurring) => {
    setSelected(r);
    setForm({
      account_id_fk: r.account_id_fk,
      category_id_fk: String(r.category_id_fk),
      savings_fund_id_fk: r.savings_fund_id_fk ?? '',
      amountRaw: String(r.amount),
      cadence: r.cadence,
      next_date: new Date(r.next_date + 'T12:00:00'),
      notes: r.notes ?? '',
      is_active: r.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    const amount = parseDecimalInput(form.amountRaw);
    const fieldErrors: Partial<Record<'amount' | 'account' | 'category' | 'nextDate', string>> = {};
    if (!form.amountRaw.trim()) fieldErrors.amount = t('pages.transactions.amountRequired');
    else if (amount === null) fieldErrors.amount = t('pages.transactions.amountInvalid');
    if (!form.account_id_fk) fieldErrors.account = t('pages.transactions.accountRequired');
    if (!form.category_id_fk) fieldErrors.category = t('pages.transactions.categoryRequired');
    if (!form.next_date) fieldErrors.nextDate = t('pages.recurring.nextDateRequired');
    if (!showFormErrors(fieldErrors) || amount === null || !form.next_date) return;
    const payload: CreateRecurringRequest = {
      account_id_fk: form.account_id_fk,
      category_id_fk: Number(form.category_id_fk),
      savings_fund_id_fk: form.savings_fund_id_fk || undefined,
      amount,
      cadence: form.cadence,
      next_date: toLocalDateString(form.next_date),
      notes: form.notes || undefined,
      is_active: form.is_active,
    };
    if (selected) {
      updateMutation.mutate({ id: selected.recurring_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }

    // Optimistic write is already in the cache — close rather than hold a spinner.
    closeModal();
  };

  const templates = recurringData?.data ?? [];
  const summary = recurringData?.summary;
  // Most overdue first among the due ones, soonest first among the upcoming ones.
  const byDate = (a: Recurring, b: Recurring) => a.next_date.localeCompare(b.next_date);
  const dueTemplates = templates.filter(r => daysDiff(r.next_date) <= 0).sort(byDate);
  const upcomingTemplates = templates.filter(r => daysDiff(r.next_date) > 0).sort(byDate);

  const cadenceLabel = (c: string) => ({
    weekly: t('pages.recurring.weekly'),
    biweekly: t('pages.recurring.biweekly'),
    monthly: t('pages.recurring.monthly'),
    quarterly: t('pages.recurring.quarterly'),
    yearly: t('pages.recurring.yearly'),
  }[c] ?? c);

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  /** "Today", "tomorrow", "in 5 days" or "Overdue · 3 days ago", then the date itself. */
  const whenText = (dateStr: string) => {
    const diff = daysDiff(dateStr);
    const when =
      diff === 0
        ? t('pages.recurring.today')
        : diff < 0
          ? `${t('pages.recurring.overdue')} · ${relative.format(diff, 'day')}`
          : relative.format(diff, 'day');
    return `${when} · ${formatDate(new Date(`${dateStr}T12:00:00`), { day: 'numeric', month: 'short' })}`;
  };

  const renderRow = (r: Recurring) => {
    const diff = daysDiff(r.next_date);
    const isDue = diff <= 0;
    const account = accounts.find(a => a.accounts_id_pk === r.account_id_fk);
    const category = categories.find(c => c.categories_id_pk === r.category_id_fk)?.category_name;
    const isPosting = postMutation.isPending && postMutation.variables === r.recurring_id_pk;
    // Temp id until the server row arrives — edit/delete/post would 404, so disable them.
    const pending = isOptimistic(r);
    const details = [r.notes ? category : null, account?.account_name, cadenceLabel(r.cadence)].filter(Boolean).join(' · ');

    return (
      <li
        key={r.recurring_id_pk}
        className={cn(
          // Phone: side line, text, amount, menu; a due row puts Post on a second line.
          // From md: Post sits in its own column before the menu.
          'grid grid-cols-[3px_minmax(0,1fr)_auto_2rem] items-center gap-x-3.5 gap-y-3 border-b border-border py-4 md:gap-x-5',
          isDue && 'md:grid-cols-[3px_minmax(0,1fr)_auto_auto_2rem]',
          pending && 'opacity-60',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'self-stretch rounded-[2px]',
            diff < 0 ? 'bg-destructive' : diff === 0 ? 'bg-primary' : 'bg-muted-foreground/25',
            isDue && 'row-span-2 md:row-span-1',
          )}
        />
        <div className="min-w-0">
          <div className="truncate text-base">{r.notes || category || '—'}</div>
          <div className="truncate text-[0.8125rem] text-muted-foreground">{details}</div>
        </div>
        <div className="text-right">
          <div className={cn('whitespace-nowrap text-[1.0625rem] tabular-nums', r.amount > 0 && 'text-success')}>
            <SensitiveValue>
              {`${r.amount > 0 ? '+' : ''}${formatMoney(r.amount, account?.currency || userCurrency)}`}
            </SensitiveValue>
          </div>
          <div className={cn('whitespace-nowrap text-[0.8125rem]', diff < 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {whenText(r.next_date)}
          </div>
        </div>
        {isDue && (
          // Nothing posts by itself: this button is the only way a due template becomes a transaction.
          <Button
            onClick={() => postMutation.mutate(r.recurring_id_pk)}
            disabled={isPosting || pending}
            className="col-span-2 col-start-2 row-start-2 h-10 px-4 md:col-span-1 md:col-start-4 md:row-start-1"
          >
            {isPosting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isPosting ? t('pages.recurring.posting') : t('pages.recurring.post')}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`${t('common.actions')}: ${r.notes || category || ''}`}
              className={cn('col-start-4 row-start-1 h-8 w-8 text-muted-foreground', isDue && 'md:col-start-5')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(r)}>
              <Pencil className="mr-2 h-4 w-4" /> {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmId(r.recurring_id_pk)}>
              <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  };

  const money = (value: number) => formatMoneyWhole(value, userCurrency);
  const countParts = (count: number) => new Intl.NumberFormat(locale).formatToParts(count);
  const summaryMetrics: Metric[] = [
    {
      key: 'monthly',
      label: t('pages.recurring.monthlyTotal'),
      value: summary?.monthly_total ?? 0,
      parts: formatMoneyParts(summary?.monthly_total ?? 0, userCurrency, 0),
      note: t('pages.recurring.monthlyHint'),
    },
    {
      key: 'annual',
      label: t('pages.recurring.annualTotal'),
      value: summary?.annual_total ?? 0,
      parts: formatMoneyParts(summary?.annual_total ?? 0, userCurrency, 0),
      note: t('pages.recurring.annualHint'),
    },
    {
      key: 'templates',
      label: t('pages.recurring.templates'),
      value: templates.length,
      parts: countParts(templates.length),
      note: t('pages.recurring.dueCount', { count: new Intl.NumberFormat(locale).format(dueTemplates.length) }),
    },
  ];

  const listHeading = (id: string, title: string, count: number) => (
    <div className="flex items-baseline gap-2.5 border-b border-foreground/30 pb-3">
      <h2 id={id} className="text-[1.125rem] font-medium tracking-[-0.01em]">{title}</h2>
      <span className="text-[0.8125rem] tabular-nums text-muted-foreground">{new Intl.NumberFormat(locale).format(count)}</span>
    </div>
  );

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
          {t('pages.recurring.title')}
        </h1>
        <Button variant="outline" onClick={() => setIsModalOpen(true)} className="h-11 px-4">
          <Plus aria-hidden="true" />
          {t('pages.recurring.add')}
        </Button>
      </header>

      {isLoading ? (
        <div className="mt-10 space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <div className="space-y-3 pt-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        </div>
      ) : error && !recurringData ? (
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.recurring.failedToLoad')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(error, t('common.unknownError'))}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.recurring.noTemplates')}
          description={t('pages.recurring.noTemplatesDescription')}
          action={{ label: t('pages.recurring.createFirst'), onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <>
          <section aria-label={t('pages.recurring.title')} className="mt-8 lg:mt-10">
            <MetricGrid metrics={summaryMetrics} size="lg" className="grid-cols-2 lg:grid-cols-3" formatAmount={money} />
          </section>

          <section aria-labelledby="recurring-due" className="mt-12 lg:mt-14">
            {listHeading('recurring-due', t('pages.recurring.dueNow'), dueTemplates.length)}
            {dueTemplates.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t('pages.recurring.noDue')}</p>
            ) : (
              <ul>{dueTemplates.map(renderRow)}</ul>
            )}
          </section>

          {upcomingTemplates.length > 0 && (
            <section aria-labelledby="recurring-upcoming" className="mt-10">
              {listHeading('recurring-upcoming', t('pages.recurring.upcoming'), upcomingTemplates.length)}
              <ul>{upcomingTemplates.map(renderRow)}</ul>
            </section>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected ? t('pages.recurring.editTitle') : t('pages.recurring.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
          <div className="space-y-4 py-2">
            {/* Amount */}
            <Field htmlFor="recurring-amount" label={t('common.amount')} error={formErrors.amount}>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const v = form.amountRaw.trim();
                    setForm(f => ({ ...f, amountRaw: v.startsWith('-') ? v.slice(1) : v ? `-${v}` : '-' }));
                  }}
                  aria-label={form.amountRaw.startsWith('-') ? t('pages.transactions.setAmountPositive') : t('pages.transactions.setAmountNegative')}
                  title={form.amountRaw.startsWith('-') ? t('pages.transactions.setAmountPositive') : t('pages.transactions.setAmountNegative')}
                >
                  {form.amountRaw.startsWith('-') ? '−' : '+'}
                </Button>
                <Input
                  id="recurring-amount"
                  inputMode="decimal"
                  pattern={DECIMAL_INPUT_PATTERN}
                  placeholder="0.00"
                  className="text-[16px] tabular-nums"
                  value={form.amountRaw}
                  onChange={e => { setForm(f => ({ ...f, amountRaw: e.target.value })); clearFormError('amount'); }}
                  {...fieldAria('recurring-amount', formErrors.amount)}
                />
              </div>
            </Field>

            {/* Account */}
            <Field htmlFor="recurring-account" label={t('common.account')} error={formErrors.account}>
              <AccountSelect
                id="recurring-account"
                accounts={accounts}
                value={form.account_id_fk}
                onValueChange={v => { setForm(f => ({ ...f, account_id_fk: v })); clearFormError('account'); }}
                placeholder={t('pages.transactions.selectAccount')}
                {...fieldAria('recurring-account', formErrors.account)}
              />
            </Field>

            {/* Category */}
            <Field htmlFor="recurring-category" label={t('common.category')} error={formErrors.category}>
              <Select value={form.category_id_fk} onValueChange={v => { setForm(f => ({ ...f, category_id_fk: v })); clearFormError('category'); }}>
                <SelectTrigger id="recurring-category" {...fieldAria('recurring-category', formErrors.category)}><SelectValue placeholder={t('pages.transactions.selectCategory')} /></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.is_active !== false).map(c => (
                    <SelectItem key={c.categories_id_pk} value={String(c.categories_id_pk)}>{c.category_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Cadence */}
            <Field htmlFor="recurring-cadence" label={t('pages.recurring.cadence')}>
              <Select value={form.cadence} onValueChange={v => setForm(f => ({ ...f, cadence: v }))}>
                <SelectTrigger id="recurring-cadence"><SelectValue placeholder={t('pages.recurring.selectCadence')} /></SelectTrigger>
                <SelectContent>
                  {['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].map(c => (
                    <SelectItem key={c} value={c}>{cadenceLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Next Date */}
            <Field htmlFor="recurring-next-date" label={t('pages.recurring.nextDate')} error={formErrors.nextDate}>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="recurring-next-date"
                    type="button"
                    className={cn(
                      'flex h-[42px] w-full items-center justify-between gap-2 py-0 text-left text-base md:text-[15px]',
                      fieldLine,
                      !form.next_date && 'text-muted-foreground dark:text-muted-foreground/80',
                    )}
                    {...fieldAria('recurring-next-date', formErrors.nextDate)}
                  >
                    <span className="truncate">
                      {form.next_date ? form.next_date.toLocaleDateString() : t('pages.transactions.pickDate')}
                    </span>
                    <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.next_date}
                    onSelect={d => { setForm(f => ({ ...f, next_date: d })); setCalendarOpen(false); clearFormError('nextDate'); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>

            {/* Savings Fund */}
            <Field htmlFor="recurring-fund" label={t('pages.transactions.savingsFundOptional')}>
              <Select value={form.savings_fund_id_fk || 'none'} onValueChange={v => setForm(f => ({ ...f, savings_fund_id_fk: v === 'none' ? '' : v }))}>
                <SelectTrigger id="recurring-fund"><SelectValue placeholder={t('pages.transactions.selectFund')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none')}</SelectItem>
                  {funds.filter(f => f.fund_is_active !== false).map(f => (
                    <SelectItem key={f.savings_funds_id_pk} value={f.savings_funds_id_pk}>{f.fund_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Notes */}
            <Field htmlFor="recurring-notes" label={t('common.notes')}>
              <Input
                id="recurring-notes"
                placeholder={t('pages.transactions.notesPlaceholder')}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>{t('common.cancel')}</Button>
            {/* Optimistic write + immediate close, so no pending gate is needed. */}
            <Button type="submit">
              {selected ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pages.recurring.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('pages.recurring.deleteDescription')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
