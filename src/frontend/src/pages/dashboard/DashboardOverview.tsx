import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DashboardSkeleton } from '@/components/skeletons';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3,
  Receipt,
  PiggyBank,
  Wallet,
  Calendar,
  Briefcase,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { summaryApi, analyticsApi } from '@/lib/api/endpoints';
import type { SummaryData, YearlyAnalyticsData } from '@/lib/api/types';
import { useUser } from '@/contexts/user-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

// Constants for charts - Teal-based palette
const COLORS = [
  'hsl(185, 70%, 45%)',   // Primary teal
  'hsl(175, 70%, 42%)',   // Secondary teal
  'hsl(38, 80%, 55%)',    // Accent gold
  'hsl(142, 71%, 45%)',   // Success green
  'hsl(195, 20%, 60%)',   // Muted
  'hsl(0, 84%, 60%)',     // Destructive red
];

const getSummaryData = async (fallbackMessage: string) => {
  const response = await summaryApi.get();
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || fallbackMessage);
};

const getYearlyAnalyticsData = async (year: number, fallbackMessage: string) => {
  const response = await analyticsApi.getYearly({ year });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || fallbackMessage);
};

const getMonthlyAnalyticsData = async (year: number, month: number, fallbackMessage: string) => {
  const response = await analyticsApi.getMonthly({ year, month });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || fallbackMessage);
};

export default function DashboardOverview() {
  const { formatCurrency, formatDate, formatMonth, t } = useUser();
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonthNumber = today.getMonth() + 1;
  const currentMonth = useMemo(
    () => formatDate(today, { month: 'long', year: 'numeric' }),
    [formatDate, today]
  );
  const prevMonthName = useMemo(
    () => formatMonth(currentMonthNumber - 2, 'short'),
    [currentMonthNumber, formatMonth]
  );

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery<SummaryData>({
    queryKey: ['summary'],
    queryFn: () => getSummaryData(t('pages.overview.loadSummaryFailed')),
  });

  const { data: yearlyData } = useQuery<YearlyAnalyticsData>({
    queryKey: ['yearly-analytics', currentYear],
    queryFn: () => getYearlyAnalyticsData(currentYear, t('pages.overview.loadYearlyFailed')),
  });

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['monthly-analytics', { year: currentYear, month: currentMonthNumber }],
      queryFn: () => getMonthlyAnalyticsData(currentYear, currentMonthNumber, t('pages.overview.loadMonthlyFailed')),
    });
    queryClient.prefetchQuery({
      queryKey: ['yearly-analytics', currentYear],
      queryFn: () => getYearlyAnalyticsData(currentYear, t('pages.overview.loadYearlyFailed')),
    });
  }, [currentMonthNumber, currentYear, queryClient, t]);

  const kpiMetrics = useMemo(() => {
    if (!data) return [];

    const toSparkData = (values?: number[]) =>
      values?.slice(0, currentMonthNumber).map((v, idx) => ({ v, idx })) ?? [];

    return [
      {
        label: t('pages.overview.totalIncome'),
        value: data.total_income,
        icon: TrendingUp,
        delta: data.comparison.income_delta_pct,
        sparkData: toSparkData(yearlyData?.monthly_income),
        color: 'text-emerald-500'
      },
      {
        label: t('pages.overview.totalExpenses'),
        value: data.total_expense,
        icon: TrendingDown,
        delta: data.comparison.expense_delta_pct,
        sparkData: toSparkData(yearlyData?.monthly_expense),
        color: 'text-rose-500',
        invert: true
      },
      {
        label: t('metrics.savings'),
        value: data.total_saving,
        icon: PiggyBank,
        delta: data.comparison.saving_delta_pct,
        sparkData: toSparkData(yearlyData?.monthly_saving),
        extra: `${(data.savings_rate * 100).toFixed(1)}% ${t('pages.overview.rate')}`,
        color: 'text-emerald-500'
      },
      {
        label: t('metrics.investments'),
        value: data.total_investment,
        icon: Briefcase,
        delta: data.comparison.investment_delta_pct,
        sparkData: toSparkData(yearlyData?.monthly_investment),
        extra: `${(data.investment_rate * 100).toFixed(1)}% ${t('pages.overview.rate')}`,
        color: 'text-primary'
      },
    ];
  }, [currentMonthNumber, data, t, yearlyData]);

  const topExpenses = useMemo(() => data?.top_expenses.slice(0, 3) ?? [], [data]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error instanceof Error ? error.message : t('states.noDataAvailable')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={t('pages.overview.title')}
        description={t('pages.overview.description', { month: currentMonth })}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/transactions">
                <Receipt className="mr-2 h-4 w-4" />
                {t('pages.overview.transactions')}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/dashboard/analytics/monthly">
                <BarChart3 className="mr-2 h-4 w-4" />
                {t('pages.overview.fullAnalytics')}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Primary KPI Section (Hero) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* HERO CARD: Net Cash Flow */}
        <div className="col-span-2 row-span-1 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">{t('pages.overview.netCashFlow')}</h3>
              <div className="flex items-baseline gap-4">
                <span className={`text-3xl sm:text-5xl font-bold font-display tracking-tight ${data.net_cash_flow >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  <SensitiveValue>{formatCurrency(data.net_cash_flow)}</SensitiveValue>
                </span>
                <span className="text-sm font-medium text-muted-foreground/60 flex items-center gap-1">
                  <SensitiveValue>{data.comparison.cashflow_delta_pct >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.cashflow_delta_pct).toFixed(1)}%</SensitiveValue>
                  <span className="text-xs text-muted-foreground/40 ml-1">{t('pages.overview.vs')} {prevMonthName}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground/60">
                {data.net_cash_flow >= 0 ? t('pages.overview.positiveCashFlow') : t('pages.overview.negativeCashFlow')}
              </p>
            </div>
          </div>
        </div>

        {/* SECONDARY CARD: Net Profit */}
        {/* SECONDARY CARD: Net Profit */}
        <div className="col-span-2 row-span-1 rounded-2xl border border-border/50 bg-card/50 p-8 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">{t('pages.overview.netProfit')}</h3>
              <div className="flex items-baseline gap-4">
                <span className={`text-3xl sm:text-5xl font-bold font-display tracking-tight ${data.profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  <SensitiveValue>{formatCurrency(data.profit)}</SensitiveValue>
                </span>
                <span className="text-sm font-medium text-muted-foreground/60 flex items-center gap-1">
                  <SensitiveValue>{data.comparison.profit_delta_pct >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.profit_delta_pct).toFixed(1)}%</SensitiveValue>
                  <span className="text-xs text-muted-foreground/40 ml-1">{t('pages.overview.vs')} {prevMonthName}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground/60">
                {data.profit >= 0 ? t('pages.overview.netPositive') : t('pages.overview.expensesExceedingIncome')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiMetrics.map((metric, i) => {
          const isPositive = metric.invert ? metric.delta <= 0 : metric.delta >= 0;
          return (
            <div key={i} className="flex flex-col justify-between p-4 rounded-xl border border-border/30 bg-card/30 hover:bg-card/50 transition-colors min-h-[110px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-background-secondary text-muted-foreground">
                      <metric.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.label}</span>
                  </div>
                  {metric.extra && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-background/50 border border-border/50 ${metric.color}`}>
                      <SensitiveValue>{metric.extra}</SensitiveValue>
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-semibold font-display tracking-tight">
                    <SensitiveValue>{formatCurrency(metric.value)}</SensitiveValue>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs ${isPositive ? 'text-success/70' : 'text-destructive/70'} font-medium flex items-center gap-1`}>
                  <SensitiveValue>{metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(1)}%</SensitiveValue> <span className="text-muted-foreground/40 font-normal">{t('pages.overview.vs')} {prevMonthName}</span>
                </span>

                {metric.sparkData.length > 0 && (
                  <div className="h-8 w-20 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metric.sparkData}>
                        <defs>
                          <linearGradient id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'}
                          strokeWidth={1.5}
                          fill={`url(#gradient-${i})`}
                          fillOpacity={1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Featured Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Largest Transactions - Revised */}
        <div
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-0 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-display">{t('pages.overview.largestTransactions')}</h3>
              <p className="text-sm text-muted-foreground">{t('pages.overview.whereMoneyWent')}</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/dashboard/transactions">{t('pages.overview.viewAll')}</Link>
            </Button>
          </div>
          <div className="p-0">
            {data.largest_transactions.length > 0 ? (
              <div className="divide-y divide-border/30">
                {data.largest_transactions.map((tx, i) => (
                  <div key={tx.id_pk || i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground">
                        {i + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{tx.notes || t('pages.overview.uncategorized')}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="font-mono font-medium text-foreground">
                      <SensitiveValue>{formatCurrency(Math.abs(Number(tx.amount)))}</SensitiveValue>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">{t('pages.overview.noTransactionsFound')}</div>
            )}
          </div>
        </div>

        {/* Insight Columns */}
        <div className="space-y-6">
          {/* Biggest Mover - Redesigned */}
          {data.biggest_mover && (
            <div
              className="rounded-2xl border border-border bg-card p-6 shadow-sm group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-mono text-primary uppercase tracking-wider mb-1">{t('pages.overview.spotlight')}</div>
                  <h3 className="text-lg font-bold font-display text-foreground">{data.biggest_mover.name}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    <SensitiveValue>{formatCurrency(data.biggest_mover.total)}</SensitiveValue>
                  </span>
                  <span className="text-xs text-muted-foreground">{t('pages.overview.totalSpend')}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('pages.overview.shareOfWallet')}</span>
                    <span className="font-medium">
                      <SensitiveValue>{(data.biggest_mover.share_of_total || 0).toFixed(1)}%</SensitiveValue>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min((data.biggest_mover.share_of_total || 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Expenses List Summary */}
          <div
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">{t('pages.overview.categoryTop3')}</h3>
            <div className="space-y-4">
              {topExpenses.map((category, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                    <span className="text-sm font-medium group-hover:text-foreground transition-colors">{category.name}</span>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                    <SensitiveValue>{formatCurrency(category.total)}</SensitiveValue>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
