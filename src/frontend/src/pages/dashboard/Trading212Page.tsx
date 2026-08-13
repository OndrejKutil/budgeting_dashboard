import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { LineChart as LineChartIcon, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { trading212Api } from '@/lib/api/endpoints';
import type { T212HistorySpan } from '@/lib/api/types';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useUser } from '@/contexts/user-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

const FEATURE_KEY = 'trading212';

const SPANS: T212HistorySpan[] = ['7d', '1m', '3m', 'ytd', '1y', 'all'];

export default function Trading212Page() {
  const { t, formatDate, formatCurrency } = useUser();
  const { enabled, isLoading: flagLoading } = useFeatureFlag(FEATURE_KEY);
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [span, setSpan] = useState<T212HistorySpan>('3m');
  const [deleteHistory, setDeleteHistory] = useState(false);

  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ['trading212', 'connection'],
    queryFn: async () => (await trading212Api.getConnection()).data,
    enabled,
  });

  const isConnected = connection?.connected === true;

  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['trading212', 'positions'],
    queryFn: async () => (await trading212Api.getPositions()).data,
    enabled: enabled && isConnected,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['trading212', 'history', span],
    queryFn: async () => (await trading212Api.getHistory(span)).data,
    enabled: enabled && isConnected,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['trading212'] });
    queryClient.invalidateQueries({ queryKey: ['net-worth'] });
  };

  const connectMutation = useMutation({
    mutationFn: () => trading212Api.connect({ api_key: apiKey, api_secret: apiSecret }),
    onSuccess: () => {
      toast({ title: t('pages.trading212.connected'), description: t('pages.trading212.connectSuccess') });
      setApiKey('');
      setApiSecret('');
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: t('pages.trading212.connectFailed'),
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => trading212Api.sync(),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: t('pages.trading212.syncSuccess') });
      } else {
        toast({ title: t('pages.trading212.syncFailed'), description: res.message, variant: 'destructive' });
      }
      invalidateAll();
    },
    onError: (error) => {
      toast({ title: t('pages.trading212.syncFailed'), description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => trading212Api.disconnect(deleteHistory),
    onSuccess: () => {
      toast({ title: t('pages.trading212.disconnectSuccess') });
      setDeleteHistory(false);
      invalidateAll();
    },
    onError: (error) => {
      toast({
        title: t('pages.trading212.disconnectFailed'),
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  if (flagLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('pages.trading212.title')} description={t('pages.trading212.description')} />
        <EmptyState
          icon={<LineChartIcon className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.trading212.notEnabledTitle')}
          description={t('pages.trading212.notEnabledDescription')}
        />
      </div>
    );
  }

  const statusBadge = () => {
    if (!connection) return null;
    switch (connection.last_sync_status) {
      case 'ok':
        return <Badge variant="default">{t('pages.trading212.syncStatusOk')}</Badge>;
      case 'auth_failed':
        return <Badge variant="destructive">{t('pages.trading212.syncStatusAuthFailed')}</Badge>;
      case 'error':
        return <Badge variant="secondary">{t('pages.trading212.syncStatusError')}</Badge>;
      default:
        return null;
    }
  };

  const chartData = (historyData?.points ?? []).map((p) => ({ date: p.snapshot_at, value: p.total_value }));

  return (
    <div className="space-y-6">
      <PageHeader title={t('pages.trading212.title')} description={t('pages.trading212.description')} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
      >
        {connectionLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !isConnected ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{t('pages.trading212.connectTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('pages.trading212.connectDescription')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="t212-api-key">{t('pages.trading212.apiKeyLabel')}</Label>
                <Input
                  id="t212-api-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t212-api-secret">{t('pages.trading212.apiSecretLabel')}</Label>
                <Input
                  id="t212-api-secret"
                  type="password"
                  autoComplete="off"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={!apiKey || !apiSecret || connectMutation.isPending}
            >
              {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('pages.trading212.connect')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t('pages.trading212.connected')}</Badge>
                {statusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                {connection?.last_synced_at
                  ? t('pages.trading212.lastSynced', { when: formatDate(connection.last_synced_at) })
                  : t('pages.trading212.neverSynced')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('pages.trading212.syncNow')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    {t('pages.trading212.disconnect')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('pages.trading212.disconnectTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('pages.trading212.disconnectDescription')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex items-center gap-2 py-2">
                    <Checkbox
                      id="t212-delete-history"
                      checked={deleteHistory}
                      onCheckedChange={(checked) => setDeleteHistory(checked === true)}
                    />
                    <Label htmlFor="t212-delete-history" className="text-sm font-normal">
                      {t('pages.trading212.deleteHistoryLabel')}
                    </Label>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteHistory(false)}>
                      {t('common.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnectMutation.mutate()}>
                      {t('pages.trading212.disconnectConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </motion.div>

      {isConnected && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">{t('pages.trading212.valueChartTitle')}</p>
              <div className="flex gap-1">
                {SPANS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpan(s)}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                      span === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t(`pages.trading212.span${s.charAt(0).toUpperCase() + s.slice(1)}` as 'pages.trading212.span7d')}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                {t('pages.trading212.noHistory')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [formatCurrency(value), t('pages.trading212.valueChartTitle')]}
                    labelFormatter={(label: string) => formatDate(label)}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium mb-3">{t('pages.trading212.positionsTitle')}</p>
            {positionsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (positionsData?.positions.length ?? 0) === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                {t('pages.trading212.noPositions')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pages.trading212.ticker')}</TableHead>
                    <TableHead className="text-right">{t('pages.trading212.quantity')}</TableHead>
                    <TableHead className="text-right">{t('pages.trading212.avgPrice')}</TableHead>
                    <TableHead className="text-right">{t('pages.trading212.currentPrice')}</TableHead>
                    <TableHead className="text-right">{t('pages.trading212.marketValue')}</TableHead>
                    <TableHead className="text-right">{t('pages.trading212.pl')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(positionsData?.positions ?? []).map((p) => (
                    <TableRow key={p.ticker}>
                      <TableCell className="font-medium">{p.ticker}</TableCell>
                      <TableCell className="text-right">
                        <SensitiveValue>{p.quantity}</SensitiveValue>
                      </TableCell>
                      <TableCell className="text-right">
                        <SensitiveValue>{formatCurrency(p.average_price)}</SensitiveValue>
                      </TableCell>
                      <TableCell className="text-right">
                        <SensitiveValue>{formatCurrency(p.current_price)}</SensitiveValue>
                      </TableCell>
                      <TableCell className="text-right">
                        <SensitiveValue>{formatCurrency(p.market_value)}</SensitiveValue>
                      </TableCell>
                      <TableCell className={cn('text-right', p.ppl >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                        <SensitiveValue>{formatCurrency(p.ppl)}</SensitiveValue>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
