import { PageHeader } from '@/components/ui/page-header';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
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
  DollarSign,
  Wallet,
  FileDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { DeferredRender } from '@/components/performance/DeferredRender';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { CHART_COLORS } from '@/lib/chart-colors';
import { StatementDocument, type StatementTable } from '@/components/analytics/StatementDocument';
import { DonutBreakdown, type DonutSlice } from '@/components/analytics/DonutBreakdown';
import { CategoryBreakdownTable } from '@/components/analytics/CategoryBreakdownTable';
import type { CategoryBreakdownData } from '@/lib/api/types/base';

/**
 * Fixed hue order for income sources.
 *
 * Only three: these are the widest-separated hues the chart tokens offer, and every
 * four-colour combination available fails either colourblind separation or the
 * normal-vision floor (the pink/green pair sits at ΔE 4.5 under deuteranopia). Anything
 * past the third source folds into a single grey "Other" slice rather than inventing a
 * fourth hue that readers cannot reliably tell apart.
 */
const INCOME_SLICE_COLORS = [
  CHART_COLORS.income,
  CHART_COLORS.savings,
  CHART_COLORS.investment,
] as const;

const SPENDING_TYPE_COLORS = {
  Core: CHART_COLORS.core,
  Necessary: CHART_COLORS.necessary,
  Fun: CHART_COLORS.fun,
  Future: CHART_COLORS.future,
} as const;

export default function MonthlyAnalyticsPage() {
  const { formatCurrency, formatDate, formatMonth, t, currency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const currentDate = useMemo(() => new Date(), []);
  const sensitiveChartClass = isPrivacyMode ? 'privacy-chart-values' : '';

  const [selectedYear, setSelectedYear] = useUrlState('year', currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useUrlState('month', (currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const selectedYearNumber = parseInt(selectedYear);
  const selectedMonthNumber = parseInt(selectedMonth);


  // Generate years for filter (current year + 4 years)
  // TODO: Get years from API
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - i + 2).toString()), [currentDate]);

  const months = useMemo(() => [
    { value: '01', label: formatMonth(0, 'long') },
    { value: '02', label: formatMonth(1, 'long') },
    { value: '03', label: formatMonth(2, 'long') },
    { value: '04', label: formatMonth(3, 'long') },
    { value: '05', label: formatMonth(4, 'long') },
    { value: '06', label: formatMonth(5, 'long') },
    { value: '07', label: formatMonth(6, 'long') },
    { value: '08', label: formatMonth(7, 'long') },
    { value: '09', label: formatMonth(8, 'long') },
    { value: '10', label: formatMonth(9, 'long') },
    { value: '11', label: formatMonth(10, 'long') },
    { value: '12', label: formatMonth(11, 'long') },
  ], [formatMonth]);

  const prevLabel = useMemo(() => {
    const prevDate = new Date(selectedYearNumber, selectedMonthNumber - 2, 1);
    return `${t('pages.monthlyAnalytics.previousPrefix')} ${formatMonth(prevDate.getMonth(), 'short')}`;
  }, [formatMonth, selectedMonthNumber, selectedYearNumber, t]);

  const spendingTypeLabels = useMemo(() => ({
    Core: t('types.core'),
    Necessary: t('types.necessary'),
    Fun: t('types.fun'),
    Future: t('types.future'),
  }), [t]);

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-analytics', { year: selectedYearNumber, month: selectedMonthNumber, currency }],
    queryFn: async () => {
      const result = await analyticsApi.getMonthly({
        year: selectedYearNumber,
        month: selectedMonthNumber,
        base_currency: currency,
      });
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || t('common.unknownError'));
    },
    placeholderData: keepPreviousData,
  });

  const incomeDonutData = useMemo(() => {
    const sorted = (data?.income_breakdown ?? [])
      .map((item) => ({ name: item.category, value: Number(item.total) }))
      .sort((a, b) => b.value - a.value);

    const slices: DonutSlice[] = sorted
      .slice(0, INCOME_SLICE_COLORS.length)
      .map((item, index) => ({ ...item, color: INCOME_SLICE_COLORS[index] }));

    const rest = sorted.slice(INCOME_SLICE_COLORS.length);
    if (rest.length > 0) {
      slices.push({
        name: t('analytics.other'),
        value: rest.reduce((sum, item) => sum + item.value, 0),
        color: CHART_COLORS.neutral,
      });
    }

    return slices;
  }, [data, t]);

  const expenseCategoryData = useMemo(() => data?.expenses_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value) ?? [], [data]);

  const spendingTypeData = useMemo(() => data?.spending_type_breakdown
    .map((item) => ({
      name: spendingTypeLabels[item.type as keyof typeof spendingTypeLabels] ?? item.type,
      value: Number(item.amount),
      // Colour by spending type rather than by position, so Core is always the same hue.
      color: SPENDING_TYPE_COLORS[item.type as keyof typeof SPENDING_TYPE_COLORS] ?? CHART_COLORS.neutral,
    }))
    .sort((a, b) => b.value - a.value) ?? [], [data, spendingTypeLabels]);

  const dailyData = useMemo(() => data?.daily_spending_heatmap.map((item) => ({
    day: new Date(item.day).getDate(),
    fullDate: item.day,
    amount: Number(item.amount),
  })) ?? [], [data]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">{t('states.noDataForMonth')}</div>;
  }

  const buildTable = (title: string, rows: CategoryBreakdownData[]): StatementTable => {
    const sorted = rows.slice().sort((a, b) => b.total - a.total);
    return {
      title,
      rows: sorted.map((r) => ({ label: r.category, value: formatCurrency(r.total) })),
      total: { label: t('statement.total'), value: formatCurrency(rows.reduce((s, r) => s + r.total, 0)) },
    };
  };

  const statementTables: StatementTable[] = [
    buildTable(t('statement.incomeByCategory'), data.income_breakdown),
    buildTable(t('statement.expensesByCategory'), data.expenses_breakdown),
    buildTable(t('statement.savingsByCategory'), data.saving_breakdown),
    buildTable(t('statement.investmentsByCategory'), data.investment_breakdown),
  ];

  return (
    <>
    <div className="screen-content space-y-6">
      <PageHeader
        title={t('pages.monthlyAnalytics.title')}
        description={t('pages.monthlyAnalytics.description', { month: selectedMonth, year: selectedYear })}
        actions={
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileDown className="h-4 w-4 mr-2" />
              {t('pages.monthlyAnalytics.exportPdf')}
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('common.month')} />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={t('common.year')} />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Unified Financial Header */}
      {(
          <div
            className="flex flex-col xl:flex-row items-stretch justify-between gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm mb-8"
          >
            {/* Core Flows */}
            <div className="flex-1 grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:pr-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-chart-income" /> {t('metrics.income')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.income)}</SensitiveValue></p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.income_delta_pct >= 0 ? 'text-chart-income' : 'text-destructive'}`}>
                    <SensitiveValue>{data.comparison.income_delta_pct > 0 ? '+' : ''}{data.comparison.income_delta_pct.toFixed(1)}%</SensitiveValue> {prevLabel}
                  </span>
                  {data.yoy_comparison && (
                    <span className="text-[9px] text-muted-foreground/50 mt-0.5">
                      <SensitiveValue>{data.yoy_comparison.income_delta_pct > 0 ? '+' : ''}{data.yoy_comparison.income_delta_pct.toFixed(1)}%</SensitiveValue>{' '}{t('pages.monthlyAnalytics.yoyPrefix')} {selectedYearNumber - 1}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-destructive" /> {t('metrics.expenses')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.expenses)}</SensitiveValue></p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.expenses_delta_pct <= 0 ? 'text-chart-income' : 'text-destructive'}`}>
                    <SensitiveValue>{data.comparison.expenses_delta_pct > 0 ? '+' : ''}{data.comparison.expenses_delta_pct.toFixed(1)}%</SensitiveValue> {prevLabel}
                  </span>
                  {data.yoy_comparison && (
                    <span className="text-[9px] text-muted-foreground/50 mt-0.5">
                      <SensitiveValue>{data.yoy_comparison.expenses_delta_pct > 0 ? '+' : ''}{data.yoy_comparison.expenses_delta_pct.toFixed(1)}%</SensitiveValue>{' '}{t('pages.monthlyAnalytics.yoyPrefix')} {selectedYearNumber - 1}
                    </span>
                  )}
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
                    <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.savings)}</SensitiveValue></p>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm"><SensitiveValue>{data.savings_rate.toFixed(1)}%</SensitiveValue></span>
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.savings_delta_pct >= 0 ? 'text-chart-income' : 'text-destructive'}`}>
                    <SensitiveValue>{data.comparison.savings_delta_pct > 0 ? '+' : ''}{data.comparison.savings_delta_pct.toFixed(1)}%</SensitiveValue> {prevLabel}
                  </span>
                  {data.yoy_comparison && (
                    <span className="text-[9px] text-muted-foreground/50 mt-0.5">
                      <SensitiveValue>{data.yoy_comparison.savings_delta_pct > 0 ? '+' : ''}{data.yoy_comparison.savings_delta_pct.toFixed(1)}%</SensitiveValue>{' '}{t('pages.monthlyAnalytics.yoyPrefix')} {selectedYearNumber - 1}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3 text-chart-investment" /> {t('metrics.investments')}
                </p>
                <div className="flex flex-col mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.investments)}</SensitiveValue></p>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm"><SensitiveValue>{data.investment_rate.toFixed(1)}%</SensitiveValue></span>
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.investments_delta_pct >= 0 ? 'text-chart-income' : 'text-destructive'}`}>
                    <SensitiveValue>{data.comparison.investments_delta_pct > 0 ? '+' : ''}{data.comparison.investments_delta_pct.toFixed(1)}%</SensitiveValue> {prevLabel}
                  </span>
                  {data.yoy_comparison && (
                    <span className="text-[9px] text-muted-foreground/50 mt-0.5">
                      <SensitiveValue>{data.yoy_comparison.investments_delta_pct > 0 ? '+' : ''}{data.yoy_comparison.investments_delta_pct.toFixed(1)}%</SensitiveValue>{' '}{t('pages.monthlyAnalytics.yoyPrefix')} {selectedYearNumber - 1}
                    </span>
                  )}
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
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.profit_delta_pct >= 0 ? 'text-chart-income' : 'text-destructive'}`}>
                    <SensitiveValue>{data.comparison.profit_delta_pct > 0 ? '+' : ''}{data.comparison.profit_delta_pct.toFixed(1)}%</SensitiveValue> {prevLabel}
                  </span>
                  {data.yoy_comparison && (
                    <span className="text-[9px] text-muted-foreground/50 mt-0.5">
                      <SensitiveValue>{data.yoy_comparison.profit_delta_pct > 0 ? '+' : ''}{data.yoy_comparison.profit_delta_pct.toFixed(1)}%</SensitiveValue>{' '}{t('pages.monthlyAnalytics.yoyPrefix')} {selectedYearNumber - 1}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <Wallet className="h-3 w-3 text-chart-cashflow" /> {t('metrics.cashFlow')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.cashflow)}</SensitiveValue></p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.cashflow_delta_pct >= 0 ? 'text-chart-income' : 'text-destructive'}`}>
                    <SensitiveValue>{data.comparison.cashflow_delta_pct > 0 ? '+' : ''}{data.comparison.cashflow_delta_pct.toFixed(1)}%</SensitiveValue> {prevLabel}
                  </span>
                  {data.yoy_comparison && (
                    <span className="text-[9px] text-muted-foreground/50 mt-0.5">
                      <SensitiveValue>{data.yoy_comparison.cashflow_delta_pct > 0 ? '+' : ''}{data.yoy_comparison.cashflow_delta_pct.toFixed(1)}%</SensitiveValue>{' '}{t('pages.monthlyAnalytics.yoyPrefix')} {selectedYearNumber - 1}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Daily Spending Chart */}
      <div
        className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
      >
        <h3 className="mb-6 text-base font-semibold font-display tracking-tight">{t('pages.monthlyAnalytics.dailySpending')}</h3>
        <div className={`h-72 ${sensitiveChartClass}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.expense} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART_COLORS.expense} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.6 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.6 }}
                tickFormatter={(v) => formatCurrency(v).replace(/(\.|,)00(?=\D*$)/, '')}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number) => [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, t('metrics.spending')]}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return formatDate(payload[0].payload.fullDate, { weekday: 'short', month: 'short', day: 'numeric' });
                  }
                  return t('pages.monthlyAnalytics.day', { day: label });
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={CHART_COLORS.expense}
                strokeWidth={3}
                fill="url(#spendingGradient)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* 2-Column Grid: Income Sources & Spending Types */}
      <DeferredRender
        className="grid gap-6 lg:grid-cols-2"
        fallback={<div className="min-h-[348px] rounded-xl border border-border/50 bg-card lg:col-span-2" />}
      >
        {/* Income Sources — same donut treatment as the spending-type breakdown; a
            handful of sources is a part-to-whole story, not a magnitude comparison. */}
        <div
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">{t('pages.monthlyAnalytics.incomeSources')}</h3>
          <div className="h-[300px]">
            {incomeDonutData.length > 0 ? (
              <DonutBreakdown
                data={incomeDonutData}
                formatCurrency={formatCurrency}
                centerLabel={t('analytics.total')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t('pages.monthlyAnalytics.noIncomeData')}</div>
            )}
          </div>
        </div>

        {/* Spending Type Breakdown */}
        <div
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">{t('pages.monthlyAnalytics.spendingTypeBreakdown')}</h3>
          <div className="h-[300px]">
            {spendingTypeData.length > 0 ? (
              <DonutBreakdown
                data={spendingTypeData}
                formatCurrency={formatCurrency}
                centerLabel={t('analytics.total')}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t('pages.monthlyAnalytics.noSpendingTypeData')}</div>
            )}
          </div>
        </div>
      </DeferredRender>

      {/* Expense Categories — a ranked table reads far better than a wide bar chart
          once a month has more than a handful of categories. */}
      <DeferredRender
        className="grid gap-6 lg:grid-cols-1"
        fallback={<div className="min-h-[348px] rounded-xl border border-border/50 bg-card" />}
      >
        <div
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-4 text-base font-semibold font-display tracking-tight">{t('pages.monthlyAnalytics.expenseCategories')}</h3>
          {expenseCategoryData.length > 0 ? (
            <CategoryBreakdownTable
              rows={expenseCategoryData}
              formatCurrency={formatCurrency}
              labels={{
                category: t('common.category'),
                amount: t('common.amount'),
                share: t('analytics.share'),
                total: t('statement.total'),
              }}
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">{t('pages.monthlyAnalytics.noExpenseData')}</div>
          )}
        </div>
      </DeferredRender>
    </div>

    <div className="print-statement">
      <StatementDocument
        brand={t('appName')}
        title={t('statement.monthlyTitle')}
        period={`${formatMonth(selectedMonthNumber - 1, 'long')} ${selectedYear}`}
        summary={[
          { label: t('metrics.income'), value: formatCurrency(data.income), tone: 'income' },
          { label: t('metrics.expenses'), value: formatCurrency(data.expenses), tone: 'expense' },
          { label: t('metrics.savings'), value: formatCurrency(data.savings) },
          { label: t('metrics.investments'), value: formatCurrency(data.investments) },
          { label: t('metrics.profit'), value: formatCurrency(data.profit), emphasis: true, tone: data.profit >= 0 ? 'income' : 'expense' },
          { label: t('metrics.cashFlow'), value: formatCurrency(data.cashflow) },
        ]}
        tables={statementTables}
      />
    </div>
    </>
  );
}
