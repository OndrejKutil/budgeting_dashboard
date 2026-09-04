import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { AnalyticsSkeleton } from '@/components/skeletons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Briefcase,
  Wallet,
  Calendar,
  Activity,
  Target,
  Zap,
  Info,
  Minus,
  DollarSign,
  FileDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { DeferredRender } from '@/components/performance/DeferredRender';
import { YearlyHeatmap } from '@/components/analytics/YearlyHeatmap';
import { StatementDocument, type StatementTable } from '@/components/analytics/StatementDocument';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { CHART_COLORS } from '@/lib/chart-colors';
import { MonthlyBreakdownTable } from '@/components/analytics/MonthlyBreakdownTable';
import { SignedBarFacet } from '@/components/analytics/SignedBarFacet';



/**
 * Gutter reserved for money axis ticks. Compact ticks still run to ~11 characters
 * ("1,3 mil. Kč"), and the chart margins must not use a negative `left` against this or
 * the labels get clipped back into the plot.
 */
const MONEY_AXIS_WIDTH = 88;

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};



export default function YearlyAnalyticsPage() {
  const { formatCurrency, formatCurrencyCompact, t, currency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const navigate = useNavigate();
  const sensitiveChartClass = isPrivacyMode ? 'privacy-chart-values' : '';
  const [selectedYear, setSelectedYear] = useUrlState('year', new Date().getFullYear().toString());
  const selectedYearNumber = parseInt(selectedYear);

  const handleMonthClick = (monthAbbr: string) => {
    const monthNum = MONTH_MAP[monthAbbr];
    if (monthNum) {
      navigate(`/dashboard/analytics/monthly?year=${selectedYear}&month=${monthNum}`);
    }
  };

  // TODO: Get years from API
  const years = useMemo(() => [2028, 2027, 2026, 2025], []);

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['yearly-analytics', selectedYearNumber, currency],
    queryFn: async () => {
      const response = await analyticsApi.getYearly({ year: selectedYearNumber, base_currency: currency });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || t('common.unknownError'));
    },
    placeholderData: keepPreviousData,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['yearly-heatmap', selectedYearNumber, currency],
    queryFn: async () => {
      const response = await analyticsApi.getYearlyHeatmap({ year: selectedYearNumber, base_currency: currency });
      if (response.success) return response.data;
      return [];
    },
    placeholderData: keepPreviousData,
  });

  const monthlyTrendsData = useMemo(() => data?.months.map((month, index) => {
    const income = data.monthly_income[index] || 0;
    const expenses = data.monthly_expense[index] || 0;
    const savings = data.monthly_saving[index] || 0;
    const investments = data.monthly_investment[index] || 0;

    // Mirrors the backend's yearly totals: profit is income net of expenses and
    // investments; cash flow additionally nets out what went into savings. The monthly
    // arrays already use income-without-savings-withdrawals and net savings, so summing
    // these columns reconciles with the KPIs at the top of the page.
    const profit = income - expenses - investments;

    return {
      month,
      income: income,
      expenses: expenses,
      savings: savings,
      investments: investments,
      profit,
      cashflow: profit - savings,
      savingsRate: income > 0 ? (savings / income) * 100 : 0,
      investmentRate: income > 0 ? (investments / income) * 100 : 0,
    };
  }) ?? [], [data]);

  // Profit and cash flow each get their own panel (see SignedBarFacet).
  const profitSeries = useMemo(
    () => monthlyTrendsData.map((row) => ({ month: row.month, value: row.profit })),
    [monthlyTrendsData],
  );
  const cashflowSeries = useMemo(
    () => monthlyTrendsData.map((row) => ({ month: row.month, value: row.cashflow })),
    [monthlyTrendsData],
  );
  const spendingTypeData = useMemo(() => data?.months.map((month, index) => ({
    month,
      Core: data.monthly_core_expense[index] || 0,
      Fun: data.monthly_fun_expense[index] || 0,
      Future: data.monthly_future_expense[index] || 0,
  })) ?? [], [data]);

  const categoryBreakdownData = useMemo(() => Object.entries(data?.expense_by_category ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value), [data]);

  /** Row pitch that keeps bars legible however many categories the year has. */
  const categoryChartHeight = Math.max(340, categoryBreakdownData.length * 34);

  const balanceData = useMemo(() => {
    if (!data) return [];

    return [
      { name: t('types.core'), value: data.spending_balance.core_share_pct, color: CHART_COLORS.core },
      { name: t('types.fun'), value: data.spending_balance.fun_share_pct, color: CHART_COLORS.fun },
      { name: t('types.future'), value: data.spending_balance.future_share_pct, color: CHART_COLORS.future },
    ].filter(d => d.value > 0);
  }, [data, t]);

  const { left: leftDomain, right: rightDomain } = useMemo(() => {
    const keysLeft = ['savings', 'investments'];
    const keysRight = ['savingsRate', 'investmentRate'];

    const minLeft = Math.min(...monthlyTrendsData.map(d => Math.min(...keysLeft.map(k => d[k] || 0))), 0);
    const maxLeft = Math.max(...monthlyTrendsData.map(d => Math.max(...keysLeft.map(k => d[k] || 0))), 0);
    const minRight = Math.min(...monthlyTrendsData.map(d => Math.min(...keysRight.map(k => d[k] || 0))), 0);
    const maxRight = Math.max(...monthlyTrendsData.map(d => Math.max(...keysRight.map(k => d[k] || 0))), 0);

    const niceScale = (min: number, max: number) => {
      const range = max - min;
      const roughStep = range / 4;
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
      const normalizedStep = roughStep / magnitude;
      let step = 1;
      if (normalizedStep > 5) step = 10;
      else if (normalizedStep > 2) step = 5;
      else if (normalizedStep > 1) step = 2;
      step *= magnitude;

      const newMax = Math.ceil(max / step) * step;
      const newMin = Math.floor(min / step) * step;
      return [newMin, newMax];
    };

    let [niceLMin, niceLMax] = niceScale(minLeft, maxLeft);
    let [niceRMin, niceRMax] = niceScale(minRight, maxRight);

    niceLMax = Math.max(niceLMax, 0); niceLMin = Math.min(niceLMin, 0);
    niceRMax = Math.max(niceRMax, 0); niceRMin = Math.min(niceRMin, 0);

    const ratioL = niceLMax === 0 ? 1000 : Math.abs(niceLMin) / niceLMax;
    const ratioR = niceRMax === 0 ? 1000 : Math.abs(niceRMin) / niceRMax;
    const finalRatio = Math.max(ratioL, ratioR);

    if (ratioL < finalRatio) {
      niceLMin = -niceLMax * finalRatio;
    }

    if (ratioR < finalRatio) {
      niceRMin = -niceRMax * finalRatio;
    }

    return {
      left: [niceLMin, niceLMax],
      right: [niceRMin, niceRMax]
    };
  }, [monthlyTrendsData]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error instanceof Error ? error.message : t('states.noDataAvailable')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>{t('common.retry')}</Button>
      </div>
    );
  }

  const buildTable = (title: string, rec: Record<string, number>): StatementTable => {
    const entries = Object.entries(rec).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
    return {
      title,
      rows: entries.map(([label, v]) => ({ label, value: formatCurrency(v) })),
      total: { label: t('statement.total'), value: formatCurrency(entries.reduce((s, [, v]) => s + v, 0)) },
    };
  };

  const statementTables: StatementTable[] = [
    buildTable(t('statement.incomeByCategory'), data.income_by_category),
    buildTable(t('statement.expensesByCategory'), data.expense_by_category),
    buildTable(t('statement.savingsByCategory'), data.saving_by_category),
    buildTable(t('statement.investmentsByCategory'), data.investment_by_category),
  ];

  return (
    <>
    <div className="screen-content space-y-6">
      <PageHeader
        title={t('pages.yearlyAnalytics.title')}
        description={t('pages.yearlyAnalytics.description', { year: selectedYear })}
        actions={
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileDown className="h-4 w-4 mr-2" />
              {t('pages.yearlyAnalytics.exportPdf')}
            </Button>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="space-y-8">
        {/* Unified Financial Header with Inline Trends */}
        <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm mb-4">
          {/* Core Flows */}
          <div className="flex-1 grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:pr-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-chart-income" /> {t('metrics.income')}
              </p>
              <div className="flex flex-col mt-1">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.total_income)}</SensitiveValue></p>
                <div className="flex items-center gap-1 mt-1">
                  {data.trend_directions?.income_trend?.direction === 'growing' ? <TrendingUp className="h-3 w-3 text-chart-income" /> : data.trend_directions?.income_trend?.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-chart-neutral" />}
                  <span className={`text-[10px] font-medium ${data.trend_directions?.income_trend?.direction === 'growing' ? 'text-chart-income' : data.trend_directions?.income_trend?.direction === 'declining' ? 'text-destructive' : 'text-chart-neutral'}`}>
                    {data.trend_directions?.income_trend?.direction === 'growing' ? t('states.growing') : data.trend_directions?.income_trend?.direction === 'declining' ? t('states.declining') : t('states.stable')} <SensitiveValue>{(data.trend_directions?.income_trend?.avg_monthly_change_pct ?? 0) > 0 ? '+' : ''}{data.trend_directions?.income_trend?.avg_monthly_change_pct ?? 0}%/mo</SensitiveValue>
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3 text-destructive" /> {t('metrics.expenses')}
              </p>
              <div className="flex flex-col mt-1">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.total_expense)}</SensitiveValue></p>
                <div className="flex items-center gap-1 mt-1">
                  {data.trend_directions?.core_expense_trend?.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-chart-income" /> : data.trend_directions?.core_expense_trend?.direction === 'growing' ? <TrendingUp className="h-3 w-3 text-chart-expense" /> : <Minus className="h-3 w-3 text-chart-neutral" />}
                  <span className={`text-[10px] font-medium ${data.trend_directions?.core_expense_trend?.direction === 'declining' ? 'text-chart-income' : data.trend_directions?.core_expense_trend?.direction === 'growing' ? 'text-chart-expense' : 'text-chart-neutral'}`}>
                    {data.trend_directions?.core_expense_trend?.direction === 'growing' ? t('states.creeping') : data.trend_directions?.core_expense_trend?.direction === 'declining' ? t('states.declining') : t('states.stable')} <SensitiveValue>{(data.trend_directions?.core_expense_trend?.avg_monthly_change_pct ?? 0) > 0 ? '+' : ''}{data.trend_directions?.core_expense_trend?.avg_monthly_change_pct ?? 0}%/mo</SensitiveValue>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wealth Generation */}
          <div className="flex-[1.2] grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:px-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <PiggyBank className="h-3 w-3 text-chart-savings" /> {t('metrics.savings')}
              </p>
              <div className="flex flex-col mt-1">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.total_saving)}</SensitiveValue></p>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm"><SensitiveValue>{data.savings_rate.toFixed(1)}%</SensitiveValue></span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {data.trend_directions?.savings_rate_trend?.direction === 'growing' ? <TrendingUp className="h-3 w-3 text-chart-income" /> : data.trend_directions?.savings_rate_trend?.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-chart-expense" /> : <Minus className="h-3 w-3 text-chart-neutral" />}
                  <span className={`text-[10px] font-medium ${data.trend_directions?.savings_rate_trend?.direction === 'growing' ? 'text-chart-income' : data.trend_directions?.savings_rate_trend?.direction === 'declining' ? 'text-chart-expense' : 'text-chart-neutral'}`}>
                    {data.trend_directions?.savings_rate_trend?.direction === 'growing' ? t('states.growing') : data.trend_directions?.savings_rate_trend?.direction === 'declining' ? t('states.declining') : t('states.stable')} <SensitiveValue>{(data.trend_directions?.savings_rate_trend?.avg_monthly_change_pct ?? 0) > 0 ? '+' : ''}{data.trend_directions?.savings_rate_trend?.avg_monthly_change_pct ?? 0}%/mo</SensitiveValue>
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-chart-investment" /> {t('metrics.investments')}
              </p>
              <div className="flex flex-col mt-1">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.total_investment)}</SensitiveValue></p>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm"><SensitiveValue>{data.investment_rate.toFixed(1)}%</SensitiveValue></span>
                </div>
                <div className="h-4 mt-1"></div>
              </div>
            </div>
          </div>

          {/* Outcomes */}
          <div className="flex-1 grid grid-cols-2 gap-4 xl:pl-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 text-chart-profit" /> {t('metrics.profit')}
              </p>
              <div className="flex flex-col mt-1">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.profit)}</SensitiveValue></p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-chart-cashflow" /> {t('metrics.cashFlow')}
              </p>
              <div className="flex flex-col mt-1">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.net_cash_flow)}</SensitiveValue></p>
              </div>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-6 text-lg font-semibold font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('pages.yearlyAnalytics.records')}
          </h3>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{t('pages.yearlyAnalytics.bestCashflow')}</span>
              <div className="mt-1">
                <span className="text-2xl font-bold font-display tracking-tight text-foreground">{data.highlights.highest_cashflow_month.month}</span>
              </div>
              <div className="text-sm font-medium text-chart-income">
                <SensitiveValue>+{formatCurrency(data.highlights.highest_cashflow_month.value)}</SensitiveValue>
              </div>
            </div>

            <div className="flex flex-col gap-1 sm:border-l sm:border-border/50 sm:pl-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{t('pages.yearlyAnalytics.highestSpend')}</span>
              <div className="mt-1">
                <span className="text-2xl font-bold font-display tracking-tight text-foreground">{data.highlights.highest_expense_month.month}</span>
              </div>
              <div className="text-sm font-medium text-destructive">
                <SensitiveValue>-{formatCurrency(data.highlights.highest_expense_month.value)}</SensitiveValue>
              </div>
            </div>

            <div className="flex flex-col gap-1 sm:border-l sm:border-border/50 sm:pl-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{t('pages.yearlyAnalytics.topSavingsRate')}</span>
              <div className="mt-1">
                <span className="text-2xl font-bold font-display tracking-tight text-foreground">{data.highlights.highest_savings_rate_month.month}</span>
              </div>
              <div className="text-sm font-medium text-primary">
                <SensitiveValue>{data.highlights.highest_savings_rate_month.value.toFixed(1)}%</SensitiveValue>
              </div>
            </div>
          </div>
        </div>

        {/* Long Term Trends Section */}
        <div className="mt-16 mb-8 border-t border-border/40 pt-12">
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">{t('pages.yearlyAnalytics.longTermTrends')}</h2>
          <p className="text-muted-foreground mt-1 text-lg">{t('pages.yearlyAnalytics.longTermDescription')}</p>
        </div>

        {/* Charts Grid */}
        <DeferredRender
          className="grid gap-8 lg:grid-cols-2"
          fallback={<div className="min-h-[368px] rounded-xl border border-border/50 bg-card lg:col-span-2" />}
        >
          {/* Income vs Expenses Chart */}
          <div
            className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold font-display">{t('pages.yearlyAnalytics.incomeVsCosts')}</h3>
                <p className="text-sm text-muted-foreground">{t('pages.yearlyAnalytics.monthlyCashFlowGap')} · <span className="text-primary/70">{t('pages.yearlyAnalytics.clickPoint')}</span></p>
              </div>
            </div>
            <div className={`h-[368px] ${sensitiveChartClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendsData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }} onClick={(e) => e?.activeLabel && handleMonthClick(e.activeLabel)} style={{ cursor: 'pointer' }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={formatCurrencyCompact}
                    width={MONEY_AXIS_WIDTH}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    itemStyle={{ padding: 0 }}
                    formatter={(value: number) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, '']}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={t('metrics.income')}
                    stroke={CHART_COLORS.income}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name={t('metrics.expenses')}
                    stroke={CHART_COLORS.expense}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Wealth Generation Chart — absolute amounts only. The savings/investment rates
              are still available per month in the breakdown table below. */}
          <div
            className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold font-display">{t('pages.yearlyAnalytics.wealthGeneration')}</h3>
                <p className="text-sm text-muted-foreground">{t('pages.yearlyAnalytics.savingsInvestments')} · <span className="text-primary/70">{t('pages.yearlyAnalytics.clickBar')}</span></p>
              </div>
            </div>
            <div className={`h-[368px] ${sensitiveChartClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendsData} barGap={2} margin={{ top: 5, right: 24, left: 0, bottom: 5 }} onClick={(e) => e?.activeLabel && handleMonthClick(e.activeLabel)} style={{ cursor: 'pointer' }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={formatCurrencyCompact}
                    width={MONEY_AXIS_WIDTH}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                    formatter={(value: number, name: string) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, name]}
                  />
                  <Legend iconType="circle" />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                  <Bar dataKey="savings" name={t('metrics.savings')} fill={CHART_COLORS.savings} maxBarSize={18} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="investments" name={t('metrics.investments')} fill={CHART_COLORS.investment} maxBarSize={18} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </DeferredRender>

        {/* Profit & Cash Flow — one panel each. See SignedBarFacet for why they aren't
            two series on a single plot. */}
        <DeferredRender
          className="mt-4"
          fallback={<div className="min-h-[300px] rounded-xl border border-border/50 bg-card" />}
        >
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold font-display">{t('pages.yearlyAnalytics.profitAndCashFlow')}</h3>
              <p className="text-sm text-muted-foreground">
                <span className="text-primary/70">{t('pages.yearlyAnalytics.clickBar')}</span>
              </p>
            </div>

            <div className={`flex flex-col gap-8 md:flex-row ${sensitiveChartClass}`}>
              <SignedBarFacet
                title={t('metrics.profit')}
                total={formatCurrency(data.profit)}
                data={profitSeries}
                formatCurrency={formatCurrency}
                formatCompact={formatCurrencyCompact}
                onMonthClick={handleMonthClick}
              />
              <SignedBarFacet
                title={t('metrics.cashFlow')}
                total={formatCurrency(data.net_cash_flow)}
                data={cashflowSeries}
                formatCurrency={formatCurrency}
                formatCompact={formatCurrencyCompact}
                onMonthClick={handleMonthClick}
              />
            </div>
          </div>
        </DeferredRender>

        {/* Monthly breakdown — the numbers behind every chart above, in one place. */}
        <DeferredRender
          className="mt-12 pt-8"
          fallback={<div className="min-h-[420px] rounded-xl border border-border/50 bg-card" />}
        >
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-2">{t('pages.yearlyAnalytics.monthlyBreakdown')}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t('pages.yearlyAnalytics.monthlyBreakdownDescription')}</p>
          <div className="rounded-xl border border-border/50 bg-card py-2 shadow-sm">
            <MonthlyBreakdownTable
              rows={monthlyTrendsData}
              formatCurrency={formatCurrency}
              onMonthClick={handleMonthClick}
              labels={{
                month: t('analytics.month'),
                income: t('metrics.income'),
                expenses: t('metrics.expenses'),
                savings: t('metrics.savings'),
                investments: t('metrics.investments'),
                profit: t('metrics.profit'),
                cashFlow: t('metrics.cashFlow'),
                total: t('analytics.total'),
              }}
            />
          </div>
        </DeferredRender>

        {/* Composition Section */}
        <DeferredRender className="mt-12 pt-8" fallback={<div className="min-h-[420px] rounded-xl border border-border/50 bg-card" />}>
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-6">{t('pages.yearlyAnalytics.compositionBalance')}</h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Balance Stats */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold font-display">{t('pages.yearlyAnalytics.spendingBalance')}</h3>
              <div className="flex items-center justify-around">
                {balanceData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      <SensitiveValue>{item.value.toFixed(1)}%</SensitiveValue>
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
                      {item.name}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-secondary/50">
                {balanceData.map((item) => (
                  <div
                    key={item.name}
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>
              <div className="mt-3 text-xs text-center text-muted-foreground/60">
                {t('pages.yearlyAnalytics.targetBalance')}
              </div>
            </div>

            {/* Spending Type Trend */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold font-display">{t('pages.yearlyAnalytics.spendingTypeHistory')}</h3>
              <div className={`h-[250px] w-full ${sensitiveChartClass}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingTypeData} stackOffset="expand" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      interval={0}
                      dy={4}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                      formatter={(value: number) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, '']}
                    />
                    <Legend iconType="circle" />
                    {/* 2px surface stroke = the gap that separates touching segments. */}
                    <Bar dataKey="Core" name={t('types.core')} stackId="a" fill={CHART_COLORS.core} stroke="hsl(var(--card))" strokeWidth={2} />
                    <Bar dataKey="Fun" name={t('types.fun')} stackId="a" fill={CHART_COLORS.fun} stroke="hsl(var(--card))" strokeWidth={2} />
                    <Bar dataKey="Future" name={t('types.future')} stackId="a" fill={CHART_COLORS.future} stroke="hsl(var(--card))" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Expense distribution — horizontal bars rather than a donut: many slices of
              similar size are near-impossible to rank by arc, and the category names are too
              long to sit on one. One series, so one colour for every bar.

              It gets its own full-width row because its height is data-dependent: pairing a
              list that grows with the category count against fixed-height cards means one
              column always ends up ragged. Full width also buys the category names real
              room instead of a 118px gutter. */}
          <div className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-semibold font-display">{t('pages.yearlyAnalytics.expenseDistribution')}</h3>
            <div className={sensitiveChartClass} style={{ height: categoryChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBreakdownData}
                  layout="vertical"
                  margin={{ top: 0, right: 104, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(name: string) => (name.length > 26 ? `${name.slice(0, 25)}…` : name)}
                    width={168}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                    formatter={(value: number) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, t('metrics.expenses')]}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.expense} maxBarSize={18} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: number) => formatCurrency(v).replace(/(\.|,)00(?=\D*$)/, '')}
                      fill="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DeferredRender>

        {/* Yearly Spending Heatmap */}
        <DeferredRender
          className="mt-12 pt-8"
          fallback={<div className="min-h-[160px] rounded-xl border border-border/50 bg-card" />}
        >
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-2">{t('pages.yearlyAnalytics.yearlyHeatmap')}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t('pages.yearlyAnalytics.heatmapDescription')}</p>
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            {heatmapData && heatmapData.length > 0 ? (
              <YearlyHeatmap data={heatmapData} year={selectedYearNumber} />
            ) : (
              <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
                {t('pages.yearlyAnalytics.heatmapNoData')}
              </div>
            )}
          </div>
        </DeferredRender>
      </div>
    </div>

    <div className="print-statement">
      <StatementDocument
        brand={t('appName')}
        title={t('statement.yearlyTitle')}
        period={selectedYear}
        summary={[
          { label: t('metrics.income'), value: formatCurrency(data.total_income), tone: 'income' },
          { label: t('metrics.expenses'), value: formatCurrency(data.total_expense), tone: 'expense' },
          { label: t('metrics.savings'), value: formatCurrency(data.total_saving) },
          { label: t('metrics.investments'), value: formatCurrency(data.total_investment) },
          { label: t('metrics.profit'), value: formatCurrency(data.profit), emphasis: true, tone: data.profit >= 0 ? 'income' : 'expense' },
          { label: t('metrics.cashFlow'), value: formatCurrency(data.net_cash_flow) },
        ]}
        tables={statementTables}
      />
    </div>
    </>
  );
}
