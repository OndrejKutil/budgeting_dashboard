import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Wallet, CreditCard, Landmark, MoreHorizontal, Pencil, Trash2, AlertCircle, Building, RefreshCw, Layers, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getErrorMessage } from '@/lib/api/client';
import { accountsApi, accountGroupsApi, netWorthApi } from '@/lib/api/endpoints';
import { Account, AccountGroup, CreateAccountRequest, UpdateAccountRequest } from '@/lib/api/types';
import { isOptimistic, markOptimistic, optimisticList, patchById, tempUuid, withoutId } from '@/lib/optimistic';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { formatMoney, getCurrencyFlag } from '@/lib/currency';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  checking: Wallet,
  savings: Landmark,
  credit: CreditCard,
  investment: Building,
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function AccountSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

/**
 * 40x16 trend line for one currency row inside a group card.
 *
 * Hand-rolled SVG rather than Recharts: at this size the chart machinery (and a
 * ResponsiveContainer per row) buys nothing, and a group card can hold half a dozen rows.
 */
function MicroSparkline({ data, className }: { data?: { balance: number }[]; className?: string }) {
  const values = data?.map((d) => d.balance) ?? [];
  if (values.length < 2) return <div className="h-4 w-10 shrink-0" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 40;
  const h = 16;
  const pad = 1; // keep the stroke from clipping at the top/bottom edge
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ACCOUNT_TYPES = ['cash', 'checking', 'credit', 'investment', 'savings'];
const CURRENCIES = ['AUD', 'CAD', 'CZK', 'EUR', 'GBP', 'PLN', 'USD'];

type NetWorthRange = '30d' | '90d' | '1y' | 'all';

function getDateRange(range: NetWorthRange): { start: string | undefined; end: string } {
  const end = new Date();
  const endStr = end.toISOString().split('T')[0];
  if (range === 'all') return { start: undefined, end: endStr };
  const start = new Date();
  if (range === '30d') start.setDate(start.getDate() - 29);
  else if (range === '90d') start.setDate(start.getDate() - 89);
  else start.setFullYear(start.getFullYear() - 1);
  return { start: start.toISOString().split('T')[0], end: endStr };
}

function buildXAxisTicks(data: { date: string }[], range: NetWorthRange): string[] {
  if (range === '30d') return [];  // let Recharts handle it
  const seen = new Set<string>();
  return data
    .filter(d => {
      const dt = new Date(d.date + 'T12:00:00');
      // 90d → one tick per month; 1y/all → one tick per quarter
      const key = range === '90d'
        ? `${dt.getFullYear()}-${dt.getMonth()}`
        : `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(d => d.date);
}

function formatXTick(v: string, range: NetWorthRange, locale: string): string {
  const d = new Date(v + 'T12:00:00');
  if (range === '30d') return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (range === '90d') return d.toLocaleDateString(locale, { month: 'short' });
  const q = Math.floor(d.getMonth() / 3) + 1;
  const yr = String(d.getFullYear()).slice(2);
  return `${yr}Q${q}`;
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { locale, t, currency: userCurrency, formatCurrency } = useUser();
  const [netWorthRange, setNetWorthRange] = useState<NetWorthRange>('1y');

  const { start: nwStart, end: nwEnd } = getDateRange(netWorthRange);
  const { data: netWorthData, isLoading: netWorthLoading } = useQuery({
    queryKey: ['net-worth', netWorthRange, userCurrency],
    queryFn: async () => {
      const res = await netWorthApi.getTimeline({
        ...(nwStart ? { start_date: nwStart } : {}),
        end_date: nwEnd,
        base_currency: userCurrency,
      });
      return res.data;
    },
  });

  const netWorthChartData = netWorthData
    ? netWorthData.dates.map((d, i) => ({ date: d, value: netWorthData.net_worth[i] }))
    : [];
  // const [accounts, setAccounts] = useState<Account[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounts', userCurrency],
    queryFn: async () => {
      const response = await accountsApi.getAll({ base_currency: userCurrency });
      return response.data;
    },
  });

  const { data: groups = [] } = useQuery({
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

  const activeAccounts = accounts.filter(a => a.account_is_active !== false);
  const inactiveAccounts = accounts.filter(a => a.account_is_active === false);
  const ungroupedActiveAccounts = activeAccounts.filter(a => !a.account_group_id_fk);
  const nativeAccounts = ungroupedActiveAccounts.filter(a => !a.currency || a.currency === userCurrency);
  const foreignAccounts = ungroupedActiveAccounts.filter(a => a.currency && a.currency !== userCurrency);
  const groupedAccounts = groups
    .map(group => ({
      group,
      members: activeAccounts.filter(a => a.account_group_id_fk === group.account_groups_id_pk),
    }))
    .filter(g => g.members.length > 0);

  const accountTypeLabel = (type: string) => ({
    cash: t('types.cash'),
    checking: t('types.checking'),
    credit: t('types.credit'),
    investment: t('types.investment'),
    savings: t('types.savings'),
  }[type] ?? type);



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

  const handleSubmit = async () => {
    if (!formData.account_name || !formData.type) {
      toast({
        title: t('common.validationError'),
        description: t('common.requiredFields'),
        variant: 'destructive',
      });
      return;
    }

    // A brand-new group must exist before the account can reference it, so this one path
    // waits for the round-trip instead of closing on the optimistic write like the rest.
    let account_group_id_fk: string | null = groupSelection === 'none' ? null : groupSelection;
    if (groupSelection === 'new') {
      if (!newGroupName.trim()) {
        toast({
          title: t('common.validationError'),
          description: t('common.requiredFields'),
          variant: 'destructive',
        });
        return;
      }
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
  };

  const handleRenameGroup = () => {
    if (!renameGroup || !renameGroupName.trim()) return;
    renameGroupMutation.mutate({ id: renameGroup.account_groups_id_pk, group_name: renameGroupName.trim() });
    setRenameGroup(null);
    setRenameGroupName('');
  };

  if (error && !isLoading && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('pages.accounts.title')}
          description={t('pages.accounts.description')}
          actions={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.accounts.add')}
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold">{t('pages.accounts.failedToLoad')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : t('common.unknownError')}</p>
        </div>
      </div>
    );
  }

  const renderAccountCard = (account: Account) => {
    const Icon = iconMap[account.type.toLowerCase()] || Wallet;
    // Optimistic rows hold a temporary id — acting on one would send a request for an account
    // that does not exist yet, so the whole actions menu stays disabled until the server row lands.
    const pending = isOptimistic(account);
    return (
      <motion.div
        key={account.accounts_id_pk}
        variants={fadeIn}
        className={cn(
          'group rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-primary/40',
          account.account_is_active === false ? 'border-border/50 opacity-60' : 'border-border hover:border-primary/50',
          pending && 'opacity-60'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{account.account_name}</h3>
                {account.account_is_active === false && (
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t('states.inactive')}
                  </span>
                )}
                {account.currency && (
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {account.currency}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{accountTypeLabel(account.type)}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`${t('common.actions')}: ${account.account_name}`}
                className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditModal(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              {account.account_is_active === false && (
                <DropdownMenuItem
                  onClick={() => updateMutation.mutate({ id: account.accounts_id_pk, data: { account_is_active: true } })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('common.activate')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteConfirmId(account.accounts_id_pk)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('metrics.currentBalance')}</p>
            <p className="text-2xl font-bold font-display">
              <SensitiveValue>{formatMoney(account.current_balance || 0, account.currency || 'CZK')}</SensitiveValue>
            </p>
          </div>

          <p className="text-right text-[10px] text-muted-foreground/70">{t('metrics.last30d')}</p>
          <div className="h-[60px] w-full">
            {account.history_30d && account.history_30d.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={account.history_30d}>
                  <defs>
                    <linearGradient id={`gradient-${account.accounts_id_pk}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill={`url(#gradient-${account.accounts_id_pk})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground/50">
                {t('states.noHistory')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('metrics.netFlowMtd')}</span>
            <span
              className={`font-medium ${(account.net_flow_mtd || 0) >= 0
                ? 'text-emerald-500'
                : 'text-destructive'
                }`}
            >
              {(account.net_flow_mtd || 0) > 0 ? '+' : ''}
              <SensitiveValue>{formatMoney(account.net_flow_mtd || 0, account.currency || 'CZK')}</SensitiveValue>
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  /**
   * A group renders as ONE card the same size and shape as an account card, sitting in the
   * same grid -- a multicurrency account the way a bank shows it, not a container of cards.
   * Members become currency rows; each keeps its own trend line and actions menu.
   */
  const renderGroupCard = ({ group, members }: { group: AccountGroup; members: Account[] }) => {
    const combinedBase = members.reduce((sum, a) => sum + (a.current_balance_base ?? 0), 0);
    const combinedFlowBase = members.reduce((sum, a) => sum + (a.net_flow_mtd_base ?? 0), 0);
    const currencyCodes = Array.from(new Set(members.map(a => a.currency || userCurrency)));
    // Two accounts can share a currency inside one group; only then is the code alone
    // ambiguous, so the account name is shown as a second line just for those rows.
    const duplicated = new Set(
      currencyCodes.filter(c => members.filter(a => (a.currency || userCurrency) === c).length > 1)
    );

    return (
      <motion.div
        key={group.account_groups_id_pk}
        variants={fadeIn}
        className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/50"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{group.group_name}</h3>
              <p className="text-sm text-muted-foreground">{currencyCodes.join(' · ')}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t('common.actions')}: ${group.group_name}`}
                className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openRenameGroup(group)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('pages.accounts.renameGroup')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteGroupConfirmId(group.account_groups_id_pk)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('pages.accounts.deleteGroup')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* flex-1 + mt-auto on the footer pins "This Month" to the bottom edge, so group
            cards with different row counts still line their footers up across a grid row.
            Deliberately no space-y-* here: its `> * ~ *` selector outranks mt-auto. */}
        <div className="mt-4 flex flex-1 flex-col">
          <div>
            <p className="text-xs text-muted-foreground">{t('metrics.totalBalance')}</p>
            <p className="text-2xl font-bold font-display">
              <SensitiveValue>{formatCurrency(combinedBase)}</SensitiveValue>
            </p>
          </div>

          <div className="mt-3 divide-y divide-border/60 border-y border-border/60">
            {members.map((account) => {
              const cur = account.currency || userCurrency;
              const pending = isOptimistic(account);
              const up = (account.net_flow_mtd || 0) >= 0;
              return (
                <div key={account.accounts_id_pk} className="group/row flex items-center gap-2 py-2">
                  <span className="text-sm leading-none">{getCurrencyFlag(cur)}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">{cur}</span>
                    {duplicated.has(cur) && (
                      <p className="truncate text-[10px] text-muted-foreground/70">{account.account_name}</p>
                    )}
                  </div>
                  <span className="flex-1 text-right text-sm font-medium tabular-nums">
                    <SensitiveValue>{formatMoney(account.current_balance || 0, cur)}</SensitiveValue>
                  </span>
                  <MicroSparkline
                    data={account.history_30d}
                    className={up ? 'text-emerald-500/70' : 'text-destructive/70'}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={`${t('common.actions')}: ${account.account_name}`}
                        className="h-6 w-6 shrink-0 opacity-100 md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditModal(account)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteConfirmId(account.accounts_id_pk)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 text-sm">
            <span className="text-muted-foreground">{t('metrics.netFlowMtd')}</span>
            <span className={`font-medium ${combinedFlowBase >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {combinedFlowBase > 0 ? '+' : ''}
              <SensitiveValue>{formatCurrency(combinedFlowBase)}</SensitiveValue>
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.accounts.title')}
        description={t('pages.accounts.description')}
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pages.accounts.add')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <AccountSkeleton key={i} />
          ))}
        </div>
      ) : activeAccounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.accounts.noActiveTitle')}
          description={t('pages.accounts.noActiveDescription')}
          action={{
            label: t('pages.accounts.addFirst'),
            onClick: () => setIsModalOpen(true),
          }}
        />
      ) : (
        <div className="space-y-8">
          {/* Groups keep their own labelled section, never mixed into the ungrouped grids --
              a multicurrency group belongs to neither the native nor the foreign bucket.
              Everything below this is the original native/foreign split, untouched. */}
          {groupedAccounts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t('pages.accounts.groups')}</p>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {groupedAccounts.map(renderGroupCard)}
              </motion.div>
            </div>
          )}

          {ungroupedActiveAccounts.length > 0 && (
            foreignAccounts.length === 0 ? (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {ungroupedActiveAccounts.map(renderAccountCard)}
              </motion.div>
            ) : (
              <div className="space-y-6">
                {nativeAccounts.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">{userCurrency}</p>
                    <motion.div
                      variants={stagger}
                      initial="hidden"
                      animate="show"
                      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {nativeAccounts.map(renderAccountCard)}
                    </motion.div>
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{t('pages.accounts.foreignCurrencies')}</p>
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {foreignAccounts.map(renderAccountCard)}
                  </motion.div>
                </div>
              </div>
            )
          )}

          {inactiveAccounts.length > 0 && (
            <Accordion type="single" collapsible className="w-full bg-card rounded-xl border px-4">
              <AccordionItem value="inactive-accounts" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4 text-muted-foreground font-medium">
                  {t('pages.accounts.inactiveAccounts')} ({inactiveAccounts.length})
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2"
                  >
                    {inactiveAccounts.map(renderAccountCard)}
                  </motion.div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      <hr className="border-border" />

      {/* Net-worth timeline chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">{t('pages.netWorth.title')}</p>
          <div className="flex gap-1">
            {(['30d', '90d', '1y', 'all'] as NetWorthRange[]).map(r => (
              <button
                key={r}
                onClick={() => setNetWorthRange(r)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                  netWorthRange === r
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(`pages.netWorth.range${r.charAt(0).toUpperCase() + r.slice(1)}` as 'pages.netWorth.range30d')}
              </button>
            ))}
          </div>
        </div>

        {netWorthLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : netWorthChartData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            {t('pages.netWorth.noData')}
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-baseline gap-2">
              <p className="text-2xl font-bold font-display">
                <SensitiveValue>
                  {formatCurrency(netWorthChartData[netWorthChartData.length - 1]?.value ?? 0)}
                </SensitiveValue>
              </p>
              {/* Headline stays liquid-only, by explicit choice -- not a "Total (liquid +
                  invested)" figure. The invested chip below is purely informational, not
                  folded into the headline number. */}
              {netWorthData?.investments && (
                <span
                  className={cn(
                    'rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium',
                    netWorthData.investments.is_stale ? 'text-muted-foreground' : 'text-emerald-500'
                  )}
                >
                  <SensitiveValue>
                    {t('pages.netWorth.investedChip', {
                      amount: formatCurrency(netWorthData.investments.total_value),
                    })}
                  </SensitiveValue>
                  {netWorthData.investments.is_stale && ` (${t('pages.netWorth.investedStale')})`}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={netWorthChartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="nw-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: string) => formatXTick(v, netWorthRange, locale)}
                  {...(netWorthRange !== '30d'
                    ? { ticks: buildXAxisTicks(netWorthChartData, netWorthRange) }
                    : { interval: 'preserveStartEnd' }
                  )}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(label: string) => new Date(label + 'T12:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                  formatter={(value: number) => [formatCurrency(value), t('pages.netWorth.title')]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#nw-gradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selectedAccount ? t('pages.accounts.editTitle') : t('pages.accounts.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">{t('pages.accounts.accountName')}</Label>
              <Input
                id="account_name"
                placeholder={t('pages.accounts.accountNamePlaceholder')}
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t('pages.accounts.accountType')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t('common.currency')}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="account_group">{t('pages.accounts.group')}</Label>
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
                  <TooltipContent side="right" className="max-w-xs">
                    <p>{t('pages.accounts.groupHelp')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              {groupSelection === 'new' && (
                <Input
                  placeholder={t('pages.accounts.groupNamePlaceholder')}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            {/* The write is optimistic and the modal closes on click, so no pending gate is
                needed here — gating on isPending would only block a quick second create. */}
            <Button onClick={handleSubmit}>
              {selectedAccount ? t('common.save') : t('pages.accounts.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t('pages.accounts.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
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
      <Dialog open={renameGroup !== null} onOpenChange={(open) => !open && setRenameGroup(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t('pages.accounts.renameGroup')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameGroupName}
              onChange={(e) => setRenameGroupName(e.target.value)}
              placeholder={t('pages.accounts.groupNamePlaceholder')}
            />
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
            <DialogTitle className="font-display">{t('pages.accounts.deleteGroupTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
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
