import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Plus,
  Repeat,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  CalendarIcon,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api/client';
import { recurringApi, accountsApi, categoriesApi, fundsApi } from '@/lib/api/endpoints';
import type { Recurring, CreateRecurringRequest } from '@/lib/api/types';
import { useUser } from '@/contexts/user-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { formatMoney } from '@/lib/currency';

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

function daysDiff(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeIn = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

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
  const { t, formatCurrency, currency: userCurrency } = useUser();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Recurring | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: recurringData, isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: recurringApi.create,
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.created') }); closeModal(); },
    onError: (err) => toast({ title: t('common.error'), description: err instanceof ApiError ? String(err.detail) : t('pages.recurring.createFailed'), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateRecurringRequest }) => recurringApi.update(id, data),
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.updated') }); closeModal(); },
    onError: (err) => toast({ title: t('common.error'), description: err instanceof ApiError ? String(err.detail) : t('pages.recurring.updateFailed'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: recurringApi.delete,
    onSuccess: () => { invalidate(); setDeleteConfirmId(null); toast({ title: t('pages.recurring.deleted'), description: t('pages.recurring.deletedDescription') }); },
    onError: () => toast({ title: t('common.error'), description: t('pages.recurring.deleteFailed'), variant: 'destructive' }),
  });

  const postMutation = useMutation({
    mutationFn: recurringApi.post,
    onSuccess: () => { invalidate(); toast({ title: t('pages.recurring.posted'), description: t('pages.recurring.postedDescription') }); },
    onError: () => toast({ title: t('common.error'), description: t('pages.recurring.postFailed'), variant: 'destructive' }),
  });

  const closeModal = () => { setIsModalOpen(false); setSelected(null); setForm(EMPTY_FORM); setCalendarOpen(false); };

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
    if (!form.account_id_fk || !form.category_id_fk || amount === null || !form.next_date) {
      toast({ title: t('common.validationError'), description: t('common.requiredFields'), variant: 'destructive' });
      return;
    }
    const payload: CreateRecurringRequest = {
      account_id_fk: form.account_id_fk,
      category_id_fk: Number(form.category_id_fk),
      savings_fund_id_fk: form.savings_fund_id_fk || undefined,
      amount,
      cadence: form.cadence,
      next_date: form.next_date.toISOString().split('T')[0],
      notes: form.notes || undefined,
      is_active: form.is_active,
    };
    if (selected) {
      updateMutation.mutate({ id: selected.recurring_id_pk, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const templates = recurringData?.data ?? [];
  const summary = recurringData?.summary;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueTemplates = templates.filter(r => daysDiff(r.next_date) <= 0);
  const upcomingTemplates = templates.filter(r => daysDiff(r.next_date) > 0);

  const cadenceLabel = (c: string) => ({
    weekly: t('pages.recurring.weekly'),
    biweekly: t('pages.recurring.biweekly'),
    monthly: t('pages.recurring.monthly'),
    quarterly: t('pages.recurring.quarterly'),
    yearly: t('pages.recurring.yearly'),
  }[c] ?? c);

  const relativeDate = (dateStr: string) => {
    const diff = daysDiff(dateStr);
    if (diff === 0) return t('pages.recurring.today');
    if (diff < 0) return `${t('pages.recurring.overdue')} (${Math.abs(diff)}d)`;
    return t('pages.recurring.inDays').replace('{n}', String(diff));
  };

  const renderCard = (r: Recurring) => {
    const diff = daysDiff(r.next_date);
    const isDue = diff <= 0;
    const account = accounts.find(a => a.accounts_id_pk === r.account_id_fk);
    const isPosting = postMutation.isPending && postMutation.variables === r.recurring_id_pk;

    return (
      <motion.div
        key={r.recurring_id_pk}
        variants={fadeIn}
        className={cn(
          'group rounded-xl border bg-card p-4 shadow-sm transition-colors',
          isDue ? 'border-primary/40 hover:border-primary/70' : 'border-border hover:border-border/80'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{r.notes || categories.find(c => c.categories_id_pk === r.category_id_fk)?.category_name || '—'}</span>
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {cadenceLabel(r.cadence)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {account?.account_name} · {relativeDate(r.next_date)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-lg font-bold font-display', r.amount >= 0 ? 'text-emerald-500' : 'text-foreground')}>
              <SensitiveValue>{formatMoney(r.amount, account?.currency || userCurrency)}</SensitiveValue>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100">
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
          </div>
        </div>
        {isDue && (
          <div className="mt-3">
            <Button
              size="sm"
              className="w-full"
              onClick={() => postMutation.mutate(r.recurring_id_pk)}
              disabled={isPosting}
            >
              {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {isPosting ? t('pages.recurring.posting') : t('pages.recurring.post')}
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.recurring.title')}
        description={t('pages.recurring.description')}
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pages.recurring.add')}
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('pages.recurring.monthlyTotal'), value: summary ? formatCurrency(summary.monthly_total) : null },
          { label: t('pages.recurring.annualTotal'), value: summary ? formatCurrency(summary.annual_total) : null },
          { label: t('pages.recurring.activeTemplates'), value: isLoading ? null : String(templates.length) },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <div className="mt-1 text-2xl font-bold font-display">
              {isLoading || card.value === null ? <Skeleton className="h-7 w-24 inline-block" /> : <SensitiveValue>{card.value}</SensitiveValue>}
            </div>
          </motion.div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Repeat className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.recurring.noTemplates')}
          description={t('pages.recurring.noTemplatesDescription')}
          action={{ label: t('pages.recurring.createFirst'), onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="space-y-6">
          {/* Due Now */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t('pages.recurring.dueNow')}</h2>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">{dueTemplates.length}</span>
            </div>
            {dueTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-6">{t('pages.recurring.noDue')}</p>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {dueTemplates.map(renderCard)}
              </motion.div>
            )}
          </div>

          {/* Upcoming */}
          {upcomingTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">{t('pages.recurring.upcoming')}</h2>
              </div>
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {upcomingTemplates.map(renderCard)}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selected ? t('pages.recurring.editTitle') : t('pages.recurring.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Amount */}
            <div className="space-y-2">
              <Label>{t('common.amount')}</Label>
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
                  title={form.amountRaw.startsWith('-') ? t('pages.transactions.setAmountPositive') : t('pages.transactions.setAmountNegative')}
                >
                  {form.amountRaw.startsWith('-') ? '−' : '+'}
                </Button>
                <Input
                  inputMode="decimal"
                  pattern={DECIMAL_INPUT_PATTERN}
                  placeholder="0.00"
                  value={form.amountRaw}
                  onChange={e => setForm(f => ({ ...f, amountRaw: e.target.value }))}
                />
              </div>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>{t('common.account')}</Label>
              <Select value={form.account_id_fk} onValueChange={v => setForm(f => ({ ...f, account_id_fk: v }))}>
                <SelectTrigger><SelectValue placeholder={t('pages.transactions.selectAccount')} /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.account_is_active !== false).map(a => (
                    <SelectItem key={a.accounts_id_pk} value={a.accounts_id_pk}>{a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>{t('common.category')}</Label>
              <Select value={form.category_id_fk} onValueChange={v => setForm(f => ({ ...f, category_id_fk: v }))}>
                <SelectTrigger><SelectValue placeholder={t('pages.transactions.selectCategory')} /></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.is_active !== false).map(c => (
                    <SelectItem key={c.categories_id_pk} value={String(c.categories_id_pk)}>{c.category_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cadence */}
            <div className="space-y-2">
              <Label>{t('pages.recurring.cadence')}</Label>
              <Select value={form.cadence} onValueChange={v => setForm(f => ({ ...f, cadence: v }))}>
                <SelectTrigger><SelectValue placeholder={t('pages.recurring.selectCadence')} /></SelectTrigger>
                <SelectContent>
                  {['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].map(c => (
                    <SelectItem key={c} value={c}>{cadenceLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Next Date */}
            <div className="space-y-2">
              <Label>{t('pages.recurring.nextDate')}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.next_date ? form.next_date.toLocaleDateString() : t('pages.transactions.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.next_date}
                    onSelect={d => { setForm(f => ({ ...f, next_date: d })); setCalendarOpen(false); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Savings Fund */}
            <div className="space-y-2">
              <Label>{t('pages.transactions.savingsFundOptional')}</Label>
              <Select value={form.savings_fund_id_fk || 'none'} onValueChange={v => setForm(f => ({ ...f, savings_fund_id_fk: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder={t('pages.transactions.selectFund')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none')}</SelectItem>
                  {funds.filter(f => f.fund_is_active !== false).map(f => (
                    <SelectItem key={f.savings_funds_id_pk} value={f.savings_funds_id_pk}>{f.fund_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Input
                placeholder={t('pages.transactions.notesPlaceholder')}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selected ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t('pages.recurring.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('pages.recurring.deleteDescription')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
