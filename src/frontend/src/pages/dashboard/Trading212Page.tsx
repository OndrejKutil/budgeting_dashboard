import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, LineChart as LineChartIcon, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
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
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { ValueLineChart } from '@/components/data/ValueLineChart';
import { cn } from '@/lib/utils';
import { formatMoneyForeign, formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { trading212Api } from '@/lib/api/endpoints';
import type { T212HistorySpan } from '@/lib/api/types';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useUser } from '@/contexts/user-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

// Matches the feature_key registered in the migration -- not "trading212".
const FEATURE_KEY = 't212_integration';

const SPANS: T212HistorySpan[] = ['7d', '1m', '3m', 'ytd', '1y', 'all'];

// "Last synced" needs time-of-day, not just the date -- a sync runs every 30 minutes, so the
// date alone is ambiguous within the same day.
const SYNCED_AT_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

type SortKey = 'market_value' | 'unrealised_pnl' | 'weight_pct';

export default function Trading212Page() {
  const { t, locale, formatDate, formatCurrency, formatCurrencyCompact, formatNumber, currency: userCurrency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const { enabled, isLoading: flagLoading } = useFeatureFlag(FEATURE_KEY);
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [span, setSpan] = useState<T212HistorySpan>('3m');
  const [deleteHistory, setDeleteHistory] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('market_value');
  const [sortDesc, setSortDesc] = useState(true);

  const {
    data: connection,
    isLoading: connectionLoading,
    error: connectionError,
    refetch: refetchConnection,
    isFetching: connectionFetching,
  } = useQuery({
    queryKey: ['trading212', 'connection'],
    queryFn: async () => (await trading212Api.getConnection()).data,
    enabled,
  });

  const isConnected = connection?.connected === true;

  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['trading212', 'positions', userCurrency],
    queryFn: async () => (await trading212Api.getPositions(userCurrency)).data,
    enabled: enabled && isConnected,
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    isPlaceholderData: historySwitching,
  } = useQuery({
    queryKey: ['trading212', 'history', span, userCurrency],
    queryFn: async () => (await trading212Api.getHistory(span, userCurrency)).data,
    enabled: enabled && isConnected,
    // Switching the span keeps the current line (dimmed) until the new one arrives.
    placeholderData: keepPreviousData,
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
        description: getErrorMessage(error, t('common.unknownError')),
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
      toast({ title: t('pages.trading212.syncFailed'), description: getErrorMessage(error, t('common.unknownError')), variant: 'destructive' });
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
        description: getErrorMessage(error, t('common.unknownError')),
        variant: 'destructive',
      });
    },
  });

  const title = (
    <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">{t('pages.trading212.title')}</h1>
  );

  if (flagLoading) {
    return (
      <div aria-busy="true">
        {title}
        <div className="mt-10 space-y-6">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-[13rem] w-full" />
        </div>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div>
        {title}
        <EmptyState
          icon={<LineChartIcon className="h-8 w-8 text-muted-foreground" />}
          title={t('pages.trading212.notEnabledTitle')}
          description={t('pages.trading212.notEnabledDescription')}
        />
      </div>
    );
  }

  if (connectionError && !connection) {
    return (
      <div>
        {title}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.trading212.loadFailed')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(connectionError, t('common.unknownError'))}</p>
          </div>
          <Button variant="outline" onClick={() => refetchConnection()} disabled={connectionFetching}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (connectionLoading) {
    return (
      <div aria-busy="true">
        {title}
        <Skeleton className="mt-10 h-24 w-full max-w-md" />
      </div>
    );
  }

  // ---- Not connected: the connect form ----------------------------------------------------------
  if (!isConnected) {
    return (
      <div>
        {title}
        <form
          noValidate
          className="mt-10 max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            if (apiKey && apiSecret && !connectMutation.isPending) connectMutation.mutate();
          }}
        >
          <h2 className="text-[1.125rem] font-medium tracking-[-0.01em]">{t('pages.trading212.connectTitle')}</h2>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            {t('pages.trading212.connectDescription')}{' '}
            <a href="/privacy#trading212" target="_blank" rel="noreferrer" className="text-foreground underline decoration-foreground/30 underline-offset-4">
              {t('pages.trading212.privacyLink')}
            </a>
          </p>
          <div className="mt-6 space-y-5">
            <Field htmlFor="t212-api-key" label={t('pages.trading212.apiKeyLabel')}>
              <Input id="t212-api-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </Field>
            <Field htmlFor="t212-api-secret" label={t('pages.trading212.apiSecretLabel')}>
              <Input
                id="t212-api-secret"
                type="password"
                autoComplete="off"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" className="mt-7 h-11 px-5" disabled={!apiKey || !apiSecret || connectMutation.isPending}>
            {connectMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t('pages.trading212.connect')}
          </Button>
        </form>
      </div>
    );
  }

  // ---- Connected ----------------------------------------------------------------------------------
  const status = connection?.last_sync_status;
  const statusText =
    status === 'auth_failed'
      ? { text: t('pages.trading212.syncStatusAuthFailed'), tone: 'text-destructive' }
      : status === 'rate_limited' || status === 'error'
        ? { text: t('pages.trading212.syncStatusError'), tone: 'text-warning' }
        : null;
  const syncedText = connection?.last_synced_at
    ? t('pages.trading212.lastSynced', { when: formatDate(connection.last_synced_at, SYNCED_AT_FORMAT) })
    : t('pages.trading212.neverSynced');

  const positions = positionsData?.positions ?? [];
  const sortedPositions = [...positions].sort((a, b) => (sortDesc ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]));
  const points = historyData?.points ?? [];
  const historyValues = points.map((point) => point.total_value);
  const historyDates = points.map((point) => point.snapshot_at);

  // The value is the latest synced snapshot of positions; until they load, the history's last point.
  const totalValue = positions.length > 0
    ? positions.reduce((sum, position) => sum + position.market_value, 0)
    : historyValues[historyValues.length - 1] ?? 0;
  const totalPnl = positions.reduce((sum, position) => sum + position.unrealised_pnl, 0);
  const rawChange = historyValues.length > 1 ? historyValues[historyValues.length - 1] - historyValues[0] : 0;
  const change = Math.abs(rawChange) < 0.5 ? 0 : rawChange;
  const spanLabel = (value: T212HistorySpan) =>
    t(`pages.trading212.span${value.charAt(0).toUpperCase() + value.slice(1)}` as 'pages.trading212.span7d');

  const money = (value: number) => formatMoneyWhole(value, userCurrency);
  const parts = (value: number) => formatMoneyParts(Math.abs(value) < 0.5 ? 0 : value, userCurrency, 0);
  const metrics: Metric[] = [
    {
      key: 'value',
      label: t('pages.trading212.valueChartTitle'),
      value: totalValue,
      parts: parts(totalValue),
      loading: positionsLoading && historyLoading,
      note: t('pages.trading212.positionsCount', { count: formatNumber(positions.length) }),
    },
    {
      key: 'pnl',
      label: t('pages.trading212.unrealisedPnl'),
      value: Math.abs(totalPnl) < 0.5 ? 0 : totalPnl,
      parts: parts(totalPnl),
      signed: true,
      loading: positionsLoading,
      note: t('pages.trading212.unrealisedHint'),
    },
    {
      key: 'change',
      label: t('pages.netWorth.change'),
      value: change,
      parts: parts(change),
      signed: true,
      loading: historyLoading,
      note: t('pages.trading212.changeOver', { span: spanLabel(span) }),
    },
  ];

  const toggleSort = (column: SortKey) => {
    if (sortBy === column) {
      setSortDesc((prev) => !prev);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  /**
   * A sortable header is a real <button> inside the <th>, not a clickable <th>: the sort
   * has to be reachable by Tab/Enter, and `aria-sort` carries the current order that the
   * arrow glyph only draws. Written as a function rather than a nested component so the
   * button keeps its identity — and therefore keyboard focus — across re-sorts.
   */
  const sortableHead = (column: SortKey, label: string) => (
    <TableHead className="text-right" aria-sort={sortBy === column ? (sortDesc ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className={cn(
          'inline-flex select-none items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          sortBy === column && 'text-foreground',
        )}
      >
        {label}
        <span aria-hidden="true" className={cn('w-2.5', sortBy !== column && 'invisible')}>{sortDesc ? '↓' : '↑'}</span>
      </button>
    </TableHead>
  );

  /**
   * Per-share prices are quoted in the instrument's own currency — a Xetra-listed ETF is priced
   * in EUR no matter that the account and this dashboard are in CZK — so they are formatted
   * with that currency, not the user's. Value and P/L stay in the user's currency; mixing the
   * two within a row is intentional and matches how T212 itself shows a position.
   *
   * instrument_currency null means the backend couldn't resolve the quote currency, so the
   * number is shown unlabelled with a marker rather than pinned to a currency we'd be guessing.
   */
  const priceCell = (amount: number, instrumentCurrency: string | null) => (
    <SensitiveValue>
      {formatMoneyForeign(amount, instrumentCurrency)}
      {!instrumentCurrency && (
        <span className="ml-1 cursor-help text-muted-foreground" title={t('pages.trading212.unknownCurrency')}>
          ?
        </span>
      )}
    </SensitiveValue>
  );

  const chartAria = isPrivacyMode || historyValues.length === 0
    ? t('pages.trading212.chartAria', { span: spanLabel(span) })
    : t('pages.trading212.chartAriaDetail', { span: spanLabel(span), amount: formatCurrency(historyValues[historyValues.length - 1]) });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {title}
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            {t('pages.trading212.connected')}
            <span aria-hidden="true"> · </span>
            {syncedText}
            {statusText && (
              <>
                <span aria-hidden="true"> · </span>
                <span className={statusText.tone}>{statusText.text}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="h-11 px-4">
            <RefreshCw className={cn(syncMutation.isPending && 'animate-spin')} aria-hidden="true" />
            {t('pages.trading212.syncNow')}
          </Button>
          <AlertDialog onOpenChange={(open) => !open && setDeleteHistory(false)}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="h-11 px-4 text-muted-foreground hover:text-destructive">
                {t('pages.trading212.disconnect')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('pages.trading212.disconnectTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('pages.trading212.disconnectDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-start gap-2.5 py-2">
                <Checkbox
                  id="t212-delete-history"
                  checked={deleteHistory}
                  onCheckedChange={(checked) => setDeleteHistory(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="t212-delete-history" className="text-sm font-normal leading-snug">
                  {t('pages.trading212.deleteHistoryLabel')}
                </Label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => disconnectMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('pages.trading212.disconnectConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <section aria-label={t('pages.trading212.valueChartTitle')} className="mt-8 lg:mt-10">
        <MetricGrid metrics={metrics} size="lg" className="grid-cols-2 lg:grid-cols-3" formatAmount={money} />

        <div className="mt-8 flex items-baseline justify-between gap-4">
          <h2 className="text-[0.8125rem] font-normal text-muted-foreground">{t('pages.trading212.valueOverTime')}</h2>
          <div role="group" aria-label={t('pages.trading212.spanLabel')} className="flex gap-3.5 text-[0.8125rem]">
            {SPANS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={span === value}
                onClick={() => setSpan(value)}
                className={cn(
                  'border-b-2 pb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  span === value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {spanLabel(value)}
              </button>
            ))}
          </div>
        </div>
        {/* Fixed height in every state, so switching span or loading never moves the page. */}
        <div className="mt-2 h-[13.125rem]">
          {historyValues.length > 0 ? (
            <div className={cn('transition-opacity', historySwitching && 'opacity-50')} aria-busy={historySwitching}>
              <ValueLineChart
                dates={historyDates}
                values={historyValues}
                locale={locale}
                formatAxis={formatCurrencyCompact}
                formatValue={formatCurrency}
                name={t('pages.trading212.valueChartTitle')}
                ariaLabel={chartAria}
              />
            </div>
          ) : historyLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <p className="flex h-full items-center justify-center text-[0.8125rem] text-muted-foreground">
              {t('pages.trading212.noHistory')}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="t212-positions" className="mt-12 lg:mt-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-foreground/30 pb-3">
          <h2 id="t212-positions" className="text-[1.125rem] font-medium tracking-[-0.01em]">
            {t('pages.trading212.positionsTitle')}
            <span className="ml-2.5 text-[0.8125rem] font-normal tabular-nums text-muted-foreground">
              {formatNumber(positions.length)}
            </span>
          </h2>
          {positionsData?.synced_at && (
            <span className="text-[0.8125rem] text-muted-foreground">
              {t('pages.trading212.lastSynced', { when: formatDate(positionsData.synced_at, SYNCED_AT_FORMAT) })}
            </span>
          )}
        </div>
        {positionsLoading ? (
          <div className="mt-3 space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : positions.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t('pages.trading212.noPositions')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pages.trading212.ticker')}</TableHead>
                <TableHead className="text-right">{t('pages.trading212.quantity')}</TableHead>
                <TableHead className="text-right">{t('pages.trading212.avgPrice')}</TableHead>
                <TableHead className="text-right">{t('pages.trading212.currentPrice')}</TableHead>
                {sortableHead('market_value', t('pages.trading212.marketValue'))}
                {sortableHead('unrealised_pnl', t('pages.trading212.pl'))}
                {sortableHead('weight_pct', t('pages.trading212.weight'))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPositions.map((position) => (
                <TableRow key={position.ticker}>
                  <TableCell>{position.ticker}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SensitiveValue>{formatNumber(position.quantity, { maximumFractionDigits: 6 })}</SensitiveValue>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {priceCell(position.average_price, position.instrument_currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{priceCell(position.current_price, position.instrument_currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SensitiveValue>{formatCurrency(position.market_value)}</SensitiveValue>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      position.unrealised_pnl > 0 ? 'text-success' : position.unrealised_pnl < 0 ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    <SensitiveValue>{`${position.unrealised_pnl > 0 ? '+' : ''}${formatCurrency(position.unrealised_pnl)}`}</SensitiveValue>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    <SensitiveValue>
                      {formatNumber(position.weight_pct / 100, { style: 'percent', maximumFractionDigits: 1 })}
                    </SensitiveValue>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
