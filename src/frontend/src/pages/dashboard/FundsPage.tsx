import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, MoreHorizontal, Pencil, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { tokenManager, ApiError } from '@/lib/api/client';
import { fundsApi } from '@/lib/api/endpoints';
import { SavingsFund, CreateSavingsFundRequest, UpdateSavingsFundRequest } from '@/lib/api/types';
import { isOptimistic, markOptimistic, optimisticList, patchById, tempUuid, withoutId } from '@/lib/optimistic';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/user-context';
import { EmptyState } from '@/components/ui/empty-state';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

type FundSortKey = 'created' | 'name' | 'progress' | 'target' | 'activity';
const FUND_SORT_STORAGE_KEY = 'funds-sort';

function sortFunds(funds: SavingsFund[], sort: FundSortKey): SavingsFund[] {
  return [...funds].sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.fund_name.localeCompare(b.fund_name);
      case 'progress': {
        const pA = a.target_amount > 0 ? (a.current_amount || 0) / a.target_amount : 0;
        const pB = b.target_amount > 0 ? (b.current_amount || 0) / b.target_amount : 0;
        return pB - pA;
      }
      case 'target':
        return b.target_amount - a.target_amount;
      case 'activity':
        return Math.abs(b.net_flow_30d || 0) - Math.abs(a.net_flow_30d || 0);
      case 'created':
      default:
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    }
  });
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function FundsPage() {
  const { formatCurrency, formatDate, t } = useUser();
  const queryClient = useQueryClient();
  // const [funds, setFunds] = useState<SavingsFund[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  const { data: funds = [], isLoading, error } = useQuery({
    queryKey: ['funds'],
    queryFn: async () => {
      const response = await fundsApi.getAll();
      return response.data;
    },
  });

  const [sortKey, setSortKey] = useState<FundSortKey>(
    () => (localStorage.getItem(FUND_SORT_STORAGE_KEY) as FundSortKey | null) ?? 'created'
  );

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
  const totalTarget = activeFunds.reduce((sum, f) => sum + f.target_amount, 0);
  const totalCurrent = activeFunds.reduce((sum, f) => sum + (f.current_amount || 0), 0);

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
      let message = t('pages.funds.createFailed');
      if (err instanceof ApiError) {
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail.map((e: { msg: string }) => e.msg).join(', ');
        } else if (typeof err.detail === 'object' && err.detail !== null) {
          message = JSON.stringify(err.detail);
        }
      }
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
      let message = t('pages.funds.updateFailed');
      if (err instanceof ApiError) {
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail.map((e: { msg: string }) => e.msg).join(', ');
        } else if (typeof err.detail === 'object' && err.detail !== null) {
          message = JSON.stringify(err.detail);
        }
      }
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticUpdate.onSettled,
  });

  const handleSubmit = async () => {
    if (!formData.fund_name || !formData.target_amount) {
      toast({
        title: t('common.validationError'),
        description: t('common.requiredFields'),
        variant: 'destructive',
      });
      return;
    }

    const userId = tokenManager.getUserId();
    if (!userId) {
      toast({
        title: t('common.authenticationError'),
        description: 'User ID not found. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      user_id_fk: userId,
      fund_name: formData.fund_name,
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
      const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : t('pages.funds.deleteFailed');
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: optimisticDelete.onSettled,
  });

  const handleDelete = (fundId: string) => {
    deleteMutation.mutate(fundId);
  };

  if (error && !isLoading && funds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('pages.funds.title')}
          description={t('pages.funds.description')}
          actions={
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.funds.create')}
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">{t('pages.funds.failedToLoad')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : t('common.unknownError')}</p>
          <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['funds'] })}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const renderFundCard = (fund: SavingsFund) => {
    const current = fund.current_amount || 0;
    const progress = fund.target_amount > 0 ? (current / fund.target_amount) * 100 : 0;
    const isComplete = progress >= 100;
    // Temp id until the server row arrives — actions would 404, so disable them.
    const pending = isOptimistic(fund);

    return (
      <motion.div
        key={fund.savings_funds_id_pk}
        variants={fadeIn}
        layout
        className={cn(
          'group rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-primary/40',
          fund.fund_is_active === false
            ? 'border-border/50 opacity-60'
            : isComplete ? 'border-success/30' : 'border-border hover:border-primary/50',
          pending && 'opacity-60'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-lg p-2.5',
                isComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
              )}
            >
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{fund.fund_name}</h3>
                {fund.fund_is_active === false && (
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t('states.inactive')}
                  </span>
                )}
              </div>
              {fund.net_flow_30d !== undefined && fund.net_flow_30d !== null && fund.net_flow_30d !== 0 && (
                <p className={cn("text-xs", fund.net_flow_30d > 0 ? "text-success" : "text-destructive")}>
                  <SensitiveValue>{fund.net_flow_30d > 0 ? '+' : ''}{formatCurrency(fund.net_flow_30d)}</SensitiveValue> {t('states.thisMonth')}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`${t('common.actions')}: ${fund.fund_name}`}
                className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenModal(fund)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              {fund.fund_is_active === false && (
                <DropdownMenuItem
                  onClick={() => updateMutation.mutate({ id: fund.savings_funds_id_pk, data: { fund_is_active: true } })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('common.activate')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteConfirmId(fund.savings_funds_id_pk)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-2xl font-bold font-display">
                <SensitiveValue>{formatCurrency(current)}</SensitiveValue>
              </span>
              <span className="text-muted-foreground/70 ml-1 text-xs">
                {t('pages.funds.of')} <SensitiveValue>{formatCurrency(fund.target_amount)}</SensitiveValue>
              </span>
            </div>
            {isComplete && (
              <span className="whitespace-nowrap rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                {t('states.goalReached')}
              </span>
            )}
          </div>
          <Progress
            value={Math.min(progress, 100)}
            className={cn('h-1.5', isComplete && '[&>div]:bg-success')}
          />
          {/* Timeline Projection */}
          {!isComplete && fund.net_flow_30d !== undefined && fund.net_flow_30d !== null && fund.net_flow_30d !== 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {fund.net_flow_30d > 0 ? (() => {
                const remaining = fund.target_amount - current;
                const monthsToGo = Math.ceil(remaining / fund.net_flow_30d);
                const projected = new Date();
                projected.setMonth(projected.getMonth() + monthsToGo);
                return `~${formatDate(projected, { month: 'short', year: 'numeric' })} ${t('states.atCurrentPace')}`;
              })() : t('states.netOutflowHint')}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.funds.title')}
        description={t('pages.funds.description')}
        actions={
          <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">{t('pages.funds.sortCreated')}</SelectItem>
                <SelectItem value="name">{t('pages.funds.sortName')}</SelectItem>
                <SelectItem value="progress">{t('pages.funds.sortProgress')}</SelectItem>
                <SelectItem value="target">{t('pages.funds.sortTarget')}</SelectItem>
                <SelectItem value="activity">{t('pages.funds.sortActivity')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.funds.create')}
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        {isLoading ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('metrics.totalSaved')}</p>
              <p className="text-3xl font-bold font-display">
                <SensitiveValue>{formatCurrency(totalCurrent)}</SensitiveValue>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('pages.funds.of')} <SensitiveValue>{formatCurrency(totalTarget)}</SensitiveValue> {t('pages.funds.activeTarget')}
              </p>
            </div>
            <div className="w-full sm:w-48">
              <Progress
                value={totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0}
                className="h-3"
              />
              <p className="mt-1 text-right text-sm text-muted-foreground">
                <SensitiveValue>{totalTarget > 0 ? ((totalCurrent / totalTarget) * 100).toFixed(0) : 0}%</SensitiveValue> {t('states.complete')}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Funds Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : activeFunds.length === 0 ? (
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
        <div className="space-y-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2"
          >
            <AnimatePresence mode='popLayout'>
              {activeFunds.map(renderFundCard)}
            </AnimatePresence>
          </motion.div>

          {inactiveFunds.length > 0 && (
            <Accordion type="single" collapsible className="w-full bg-card rounded-xl border px-4">
              <AccordionItem value="inactive-funds" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4 text-muted-foreground font-medium">
                  {t('pages.funds.inactiveFunds')} ({inactiveFunds.length})
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 sm:grid-cols-2 pt-2"
                  >
                    <AnimatePresence mode='popLayout'>
                      {inactiveFunds.map(renderFundCard)}
                    </AnimatePresence>
                  </motion.div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedFund ? t('pages.funds.editTitle') : t('pages.funds.createTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('pages.funds.fundName')}</Label>
              <Input
                id="name"
                placeholder={t('pages.funds.fundNamePlaceholder')}
                value={formData.fund_name}
                onChange={(e) => setFormData({ ...formData, fund_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">{t('pages.funds.targetAmount')}</Label>
              <Input
                id="target"
                type="number"
                placeholder="5000"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            {/* Optimistic write + immediate close, so no pending gate is needed. */}
            <Button onClick={handleSubmit}>
              {selectedFund ? t('common.save') : t('pages.funds.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t('pages.funds.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t('pages.funds.deleteDescription')}
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
    </div>
  );
}
