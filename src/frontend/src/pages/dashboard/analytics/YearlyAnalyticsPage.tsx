import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, FileDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useUrlState } from '@/hooks/use-url-state';
import { useAvailableYears } from '@/hooks/use-available-years';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { Button } from '@/components/ui/button';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import type { TrendDirectionItem } from '@/lib/api/types/base';
import { DeferredRender } from '@/components/performance/DeferredRender';
import { YearlyHeatmap } from '@/components/analytics/YearlyHeatmap';
import { StatementDocument, type StatementTable } from '@/components/analytics/StatementDocument';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { CHART_COLORS } from '@/lib/chart-colors';
import { MonthlyBreakdownTable } from '@/components/analytics/MonthlyBreakdownTable';
import { SignedBarFacet } from '@/components/analytics/SignedBarFacet';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { SplitBar, type SplitSegment } from '@/components/data/SplitBar';
import { formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { cn } from '@/lib/utils';

/**
 * Gutter reserved for money axis ticks. Compact ticks still run to ~11 characters
 * ("1,3 mil. Kč"), and the chart margins must not use a negative `left` against this or
 * the labels get clipped back into the plot.
 */
const MONEY_AXIS_WIDTH = 88;

/** The API names months by English abbreviation; this maps them to a 0-based index. */
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const GRID_STROKE = 'hsl(var(--foreground) / 0.07)';
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.75rem',
  color: 'hsl(var(--popover-foreground))',
  fontSize: '0.75rem',
};

/** A value that displays as 0 is 0: no "-0". */
const whole = (value: number) => (Math.abs(value) < 0.5 ? 0 : value);

export default function YearlyAnalyticsPage() {
  const { formatCurrency, formatCurrencyCompact, formatMonth, formatNumber, t, currency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const navigate = useNavigate();
  const sensitiveChartClass = isPrivacyMode ? 'privacy-chart-values' : '';
  const [selectedYear, setSelectedYear] = useUrlState('year', new Date().getFullYear().toString());
  const selectedYearNumber = parseInt(selectedYear);
  const years = useAvailableYears({ include: selectedYearNumber });

  const monthHref = (monthAbbr: string) => {
    const index = MONTH_INDEX[monthAbbr];
    return index === undefined
      ? null
      : `/dashboard/analytics/monthly?year=${selectedYear}&month=${String(index + 1).padStart(2, '0')}`;
  };
  const handleMonthClick = (monthAbbr: string) => {
    const href = monthHref(monthAbbr);
    if (href) navigate(href);
  };
  const monthShort = (monthAbbr: string) =>
    MONTH_INDEX[monthAbbr] === undefined ? monthAbbr : formatMonth(MONTH_INDEX[monthAbbr], 'short');
  const monthLong = (monthAbbr: string) =>
    MONTH_INDEX[monthAbbr] === undefined ? monthAbbr : formatMonth(MONTH_INDEX[monthAbbr], 'long');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['yearly-analytics', selectedYearNumber, currency],
    queryFn: async () => {
      const response = await analyticsApi.getYearly({ year: selectedYearNumber, base_currency: currency });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || t('pages.yearlyAnalytics.loadFailed'));
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
    // these columns reconciles with the figures at the top of the page.
    const profit = income - expenses - investments;

    return {
      month,
      income,
      expenses,
      savings,
      investments,
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

  const header = (canExport: boolean) => (
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:mb-10">
      <h1 className="min-w-0 text-[1.5rem] font-medium tracking-tight text-foreground sm:text-[1.625rem]">
        {selectedYear}
        <span className="ml-3 whitespace-nowrap text-[1rem] font-normal text-muted-foreground">
          {t('pages.yearlyAnalytics.title')}
        </span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <PeriodNavigator
          mode="year"
          year={selectedYearNumber}
          years={years}
          onChange={(_, y) => setSelectedYear(String(y))}
          className="[&>div:first-child]:gap-1 [&>div:first-child]:border-transparent [&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:shadow-none"
        />
        <Button variant="outline" className="h-11 px-4" onClick={() => window.print()} disabled={!canExport}>
          <FileDown className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          {t('pages.yearlyAnalytics.exportPdf')}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="screen-content">
        {header(false)}
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="screen-content">
        {header(false)}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.yearlyAnalytics.errorTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('states.noDataAvailable')}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Print statement ---------------------------------------------------------------------------
  const buildTable = (title: string, rec: Record<string, number>): StatementTable => {
    const entries = Object.entries(rec).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
    return {
      title,
      rows: entries.map(([label, v]) => ({ label, value: formatCurrency(v) })),
      total: { label: t('statement.total'), value: formatCurrency(entries.reduce((s, [, v]) => s + v, 0)) },
    };
  };

  const statement = (
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
        tables={[
          buildTable(t('statement.incomeByCategory'), data.income_by_category),
          buildTable(t('statement.expensesByCategory'), data.expense_by_category),
          buildTable(t('statement.savingsByCategory'), data.saving_by_category),
          buildTable(t('statement.investmentsByCategory'), data.investment_by_category),
        ]}
      />
    </div>
  );

  const isEmpty =
    whole(data.total_income) === 0 &&
    whole(data.total_expense) === 0 &&
    whole(data.total_saving) === 0 &&
    whole(data.total_investment) === 0;

  if (isEmpty) {
    return (
      <>
        <div className="screen-content">
          {header(true)}
          <div className="flex min-h-[20rem] flex-col items-center justify-center gap-2 text-center">
            <p className="text-[1.1875rem] font-light">{t('pages.yearlyAnalytics.emptyTitle', { year: selectedYear })}</p>
            <p className="max-w-[40ch] text-sm text-muted-foreground">{t('pages.yearlyAnalytics.emptyDescription')}</p>
          </div>
        </div>
        {statement}
      </>
    );
  }

  // ---- Summary figures ---------------------------------------------------------------------------
  const money = (value: number) => formatMoneyWhole(value, currency);
  const parts = (value: number) => formatMoneyParts(value, currency, 0);
  const percent = (value: number) => formatNumber(value / 100, { style: 'percent', maximumFractionDigits: 1 });

  /**
   * "Growing · +1.2 % a month". `rising` says whether growth is good news (income, savings rate)
   * or bad news (core spending), which decides the colour; "Creeping" is the word for spending.
   */
  const trendNote = (prefix: string, item: TrendDirectionItem | undefined, rising: 'good' | 'bad'): ReactNode => {
    if (!item) return null;
    const word =
      item.direction === 'growing'
        ? t(rising === 'bad' ? 'states.creeping' : 'states.growing')
        : item.direction === 'declining'
          ? t('states.declining')
          : t('states.stable');
    const tone =
      item.direction === 'stable'
        ? 'text-muted-foreground'
        : (item.direction === 'growing') === (rising === 'good')
          ? 'text-success'
          : 'text-destructive';
    const change = formatNumber(item.avg_monthly_change_pct / 100, {
      style: 'percent',
      signDisplay: 'exceptZero',
      maximumFractionDigits: 1,
    });
    return (
      <span className={tone}>
        {prefix}: {word.toLowerCase()}
        {' · '}
        <SensitiveValue>{t('pages.yearlyAnalytics.perMonth', { change })}</SensitiveValue>
      </span>
    );
  };

  const income = whole(data.total_income);
  const ofIncome = (rate: number) => (income > 0 ? t('metrics.ofIncome', { rate: percent(rate) }) : undefined);
  const trends = data.trend_directions;

  const metrics: Metric[] = [
    {
      key: 'income',
      label: t('metrics.income'),
      value: income,
      parts: parts(income),
      note: trendNote(t('pages.yearlyAnalytics.trendIncome'), trends?.income_trend, 'good'),
    },
    {
      key: 'expenses',
      label: t('metrics.expenses'),
      value: whole(data.total_expense),
      parts: parts(whole(data.total_expense)),
      note: trendNote(t('pages.yearlyAnalytics.trendCore'), trends?.core_expense_trend, 'bad'),
    },
    {
      key: 'saved',
      label: t('metrics.saved'),
      value: whole(data.total_saving),
      parts: parts(whole(data.total_saving)),
      sub: ofIncome(data.savings_rate),
      note: trendNote(t('pages.yearlyAnalytics.trendSavingsRate'), trends?.savings_rate_trend, 'good'),
    },
    {
      key: 'invested',
      label: t('metrics.invested'),
      value: whole(data.total_investment),
      parts: parts(whole(data.total_investment)),
      sub: ofIncome(data.investment_rate),
      note: null,
    },
    {
      key: 'profit',
      label: t('metrics.profit'),
      value: whole(data.profit),
      parts: parts(whole(data.profit)),
      note: null,
    },
    {
      key: 'cashflow',
      label: t('metrics.cashFlow'),
      value: whole(data.net_cash_flow),
      parts: parts(whole(data.net_cash_flow)),
      accent: true,
      note: null,
    },
  ];

  // ---- Records: the year's best and worst months, each linking to that month -------------------
  const records = [
    {
      key: 'cashflow',
      label: t('pages.yearlyAnalytics.bestCashflow'),
      month: data.highlights.highest_cashflow_month.month,
      value: money(data.highlights.highest_cashflow_month.value),
      tone: data.highlights.highest_cashflow_month.value >= 0 ? 'text-success' : 'text-destructive',
    },
    {
      key: 'spend',
      label: t('pages.yearlyAnalytics.highestSpend'),
      month: data.highlights.highest_expense_month.month,
      value: money(data.highlights.highest_expense_month.value),
      tone: 'text-muted-foreground',
    },
    {
      key: 'rate',
      label: t('pages.yearlyAnalytics.topSavingsRate'),
      month: data.highlights.highest_savings_rate_month.month,
      value: percent(data.highlights.highest_savings_rate_month.value),
      tone: 'text-muted-foreground',
    },
  ];

  // ---- Composition -------------------------------------------------------------------------------
  const balance = data.spending_balance;
  const shareText = (value: number) => percent(value);
  const balanceSegments: SplitSegment[] = [
    { key: 'core', label: t('types.core'), value: balance.core_share_pct, percent: shareText(balance.core_share_pct), tone: 'strong' },
    { key: 'fun', label: t('types.fun'), value: balance.fun_share_pct, percent: shareText(balance.fun_share_pct), tone: 'medium' },
    { key: 'future', label: t('types.future'), value: balance.future_share_pct, percent: shareText(balance.future_share_pct), tone: 'accent' },
  ];

  const expenseSorted = Object.entries(data.expense_by_category ?? {})
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const expenseTotal = expenseSorted.reduce((sum, item) => sum + item.value, 0);
  const expenseLargest = expenseSorted[0]?.value ?? 0;
  const expenseRows: LineRow[] = expenseSorted.map((item) => ({
    key: item.name,
    label: item.name,
    detail: expenseTotal > 0 ? percent((item.value / expenseTotal) * 100) : undefined,
    amount: money(item.value),
    ratio: expenseLargest > 0 ? item.value / expenseLargest : 0,
  }));

  const sectionHeading = 'text-[1.125rem] font-medium tracking-[-0.01em]';
  const chartHeading = 'text-[0.8125rem] font-normal text-muted-foreground';
  const clickHint = <span className="text-muted-foreground/70"> · {t('pages.yearlyAnalytics.clickMonth')}</span>;

  return (
    <>
      <div className="screen-content">
        {header(true)}

        <section aria-label={t('pages.yearlyAnalytics.title')} className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <MetricGrid metrics={metrics} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" formatAmount={money} />
        </section>

        {/* Records */}
        <section aria-labelledby="yearly-records" className="mt-12">
          <h2 id="yearly-records" className={cn(chartHeading, 'mb-1.5')}>{t('pages.yearlyAnalytics.records')}</h2>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {records.map((record) => {
              const href = monthHref(record.month);
              const name = monthLong(record.month);
              return (
                <div key={record.key} className="min-w-0 border-t border-border pt-3">
                  <div className="text-[0.8125rem] text-muted-foreground">{record.label}</div>
                  <div className="mt-1 text-[1.25rem] tracking-[-0.01em]">
                    {href ? (
                      <Link to={href} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                  </div>
                  <div className={cn('text-[0.8125rem] tabular-nums', record.tone)}>
                    <SensitiveValue>{record.value}</SensitiveValue>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Month by month */}
        <DeferredRender
          className="mt-14 grid gap-x-14 gap-y-12 lg:grid-cols-2"
          fallback={<div className="mt-14 min-h-[22rem]" />}
        >
          <section aria-labelledby="yearly-income-costs" className="min-w-0">
            <h2 id="yearly-income-costs" className={cn(chartHeading, 'mb-3')}>
              {t('pages.yearlyAnalytics.incomeVsCosts')}
              {clickHint}
            </h2>
            <div className={`h-[18rem] ${sensitiveChartClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrendsData}
                  margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
                  onClick={(e) => e?.activeLabel && handleMonthClick(String(e.activeLabel))}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={monthShort} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={formatCurrencyCompact} width={MONEY_AXIS_WIDTH} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => monthLong(String(label))}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                    formatter={(value: number, name: string) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, name]}
                  />
                  <Line type="monotone" dataKey="income" name={t('metrics.income')} stroke={CHART_COLORS.income} strokeWidth={2} dot={false} />
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
            <Legend
              items={[
                { label: t('metrics.income'), color: CHART_COLORS.income },
                { label: t('metrics.expenses'), color: CHART_COLORS.expense },
              ]}
            />
          </section>

          <section aria-labelledby="yearly-wealth" className="min-w-0">
            <h2 id="yearly-wealth" className={cn(chartHeading, 'mb-3')}>
              {t('pages.yearlyAnalytics.wealthGeneration')}
              {clickHint}
            </h2>
            <div className={`h-[18rem] ${sensitiveChartClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyTrendsData}
                  barGap={2}
                  margin={{ top: 5, right: 12, left: 0, bottom: 0 }}
                  onClick={(e) => e?.activeLabel && handleMonthClick(String(e.activeLabel))}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={monthShort} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={formatCurrencyCompact} width={MONEY_AXIS_WIDTH} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label) => monthLong(String(label))}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                    formatter={(value: number, name: string) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, name]}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--foreground) / 0.2)" strokeWidth={1} />
                  <Bar dataKey="savings" name={t('metrics.savings')} fill={CHART_COLORS.savings} maxBarSize={12} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="investments" name={t('metrics.investments')} fill={CHART_COLORS.investment} maxBarSize={12} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend
              items={[
                { label: t('metrics.savings'), color: CHART_COLORS.savings },
                { label: t('metrics.investments'), color: CHART_COLORS.investment },
              ]}
            />
          </section>

          {/* Profit & Cash Flow — one panel each. See SignedBarFacet for why they aren't
              two series on a single plot. */}
          <section aria-labelledby="yearly-profit" className="min-w-0 lg:col-span-2">
            <h2 id="yearly-profit" className={cn(chartHeading, 'mb-3')}>
              {t('pages.yearlyAnalytics.profitAndCashFlow')}
              {clickHint}
            </h2>
            <div className={`flex flex-col gap-10 md:flex-row ${sensitiveChartClass}`}>
              <SignedBarFacet
                title={t('metrics.profit')}
                total={formatCurrency(data.profit)}
                data={profitSeries}
                formatCurrency={formatCurrency}
                formatCompact={formatCurrencyCompact}
                onMonthClick={handleMonthClick}
                monthLabel={monthShort}
              />
              <SignedBarFacet
                title={t('metrics.cashFlow')}
                total={formatCurrency(data.net_cash_flow)}
                data={cashflowSeries}
                formatCurrency={formatCurrency}
                formatCompact={formatCurrencyCompact}
                onMonthClick={handleMonthClick}
                monthLabel={monthShort}
              />
            </div>
          </section>
        </DeferredRender>

        {/* Monthly breakdown — the numbers behind every chart above, in one place. */}
        <DeferredRender className="mt-16" fallback={<div className="mt-16 min-h-[26rem]" />}>
          <section aria-labelledby="yearly-breakdown">
            <h2 id="yearly-breakdown" className={sectionHeading}>{t('pages.yearlyAnalytics.monthlyBreakdown')}</h2>
            <p className="mb-4 mt-0.5 text-[0.8125rem] text-muted-foreground">{t('pages.yearlyAnalytics.monthlyBreakdownDescription')}</p>
            <MonthlyBreakdownTable
              rows={monthlyTrendsData}
              formatCurrency={formatCurrency}
              onMonthClick={handleMonthClick}
              monthLabel={monthLong}
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
          </section>
        </DeferredRender>

        {/* Composition */}
        <DeferredRender className="mt-16" fallback={<div className="mt-16 min-h-[26rem]" />}>
          <h2 className={cn(sectionHeading, 'border-b border-foreground/30 pb-3')}>{t('pages.yearlyAnalytics.compositionBalance')}</h2>
          <div className="mt-6 grid gap-x-14 gap-y-12 lg:grid-cols-2">
            <section aria-labelledby="yearly-balance" className="min-w-0">
              <h3 id="yearly-balance" className={cn(chartHeading, 'mb-3')}>{t('pages.yearlyAnalytics.spendingBalance')}</h3>
              <SplitBar segments={balanceSegments} />
              <p className="mt-3 text-[0.8125rem] text-muted-foreground">{t('pages.yearlyAnalytics.targetBalance')}</p>
            </section>

            <section aria-labelledby="yearly-type-history" className="min-w-0">
              <h3 id="yearly-type-history" className={cn(chartHeading, 'mb-3')}>{t('pages.yearlyAnalytics.spendingTypeHistory')}</h3>
              <div className={`h-[14rem] w-full ${sensitiveChartClass}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingTypeData} stackOffset="expand" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={monthShort} interval={0} dy={4} />
                    <YAxis
                      tickFormatter={(v: number) => formatNumber(v, { style: 'percent', maximumFractionDigits: 0 })}
                      axisLine={false}
                      tickLine={false}
                      tick={AXIS_TICK}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(label) => monthLong(String(label))}
                      formatter={(value: number, name: string) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, name]}
                    />
                    {/* 1px background stroke = the gap that separates touching segments. */}
                    <Bar dataKey="Core" name={t('types.core')} stackId="a" fill="hsl(var(--foreground) / 0.45)" stroke="hsl(var(--background))" strokeWidth={1} />
                    <Bar dataKey="Fun" name={t('types.fun')} stackId="a" fill="hsl(var(--foreground) / 0.25)" stroke="hsl(var(--background))" strokeWidth={1} />
                    <Bar dataKey="Future" name={t('types.future')} stackId="a" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend
                items={[
                  { label: t('types.core'), color: 'hsl(var(--foreground) / 0.45)' },
                  { label: t('types.fun'), color: 'hsl(var(--foreground) / 0.25)' },
                  { label: t('types.future'), color: 'hsl(var(--primary))' },
                ]}
              />
            </section>
          </div>

          {/* Expense distribution — ranked rows rather than a donut: many slices of similar
              size are near-impossible to rank by arc, and category names are too long to sit on one. */}
          <section aria-labelledby="yearly-expense-distribution" className="mt-12">
            <h3 id="yearly-expense-distribution" className={cn(chartHeading, 'mb-1.5')}>{t('pages.yearlyAnalytics.expenseDistribution')}</h3>
            {expenseRows.length > 0 ? (
              <LineRows rows={expenseRows} className="lg:columns-2 lg:gap-x-14 [&>li]:break-inside-avoid" barClassName="bg-foreground/50" />
            ) : (
              <p className="py-3 text-sm text-muted-foreground">{t('pages.monthlyAnalytics.noExpenseData')}</p>
            )}
          </section>
        </DeferredRender>

        {/* Full-year spending heatmap */}
        <DeferredRender className="mt-16" fallback={<div className="mt-16 min-h-[10rem]" />}>
          <section aria-labelledby="yearly-heatmap">
            <h2 id="yearly-heatmap" className={sectionHeading}>{t('pages.yearlyAnalytics.yearlyHeatmap')}</h2>
            <p className="mb-4 mt-0.5 text-[0.8125rem] text-muted-foreground">{t('pages.yearlyAnalytics.heatmapDescription')}</p>
            {heatmapData && heatmapData.length > 0 ? (
              <YearlyHeatmap data={heatmapData} year={selectedYearNumber} />
            ) : (
              <p className="py-8 text-sm text-muted-foreground">{t('pages.yearlyAnalytics.heatmapNoData')}</p>
            )}
          </section>
        </DeferredRender>
      </div>

      {statement}
    </>
  );
}

/** Inline legend: a short line in each series' colour, then its name. */
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-[2px] w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
