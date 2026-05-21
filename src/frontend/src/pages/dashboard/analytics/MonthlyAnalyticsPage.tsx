import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
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
  DollarSign,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from 'recharts';
import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { DeferredRender } from '@/components/performance/DeferredRender';



const COLORS = [
  'hsl(185, 70%, 45%)',
  'hsl(168, 84%, 42%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(215, 14%, 64%)',
  'hsl(0, 84%, 60%)',
  'hsl(142, 71%, 45%)',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload?: unknown;
  }>;
  formatCurrency: (value: number) => string;
}

const CustomTooltip = ({ active, payload, formatCurrency }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div style={{
        backgroundColor: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}>
        <p style={{ color: 'hsl(var(--popover-foreground))', fontSize: '12px', marginBottom: '2px' }}>
          {data.name}
        </p>
        <p style={{ color: 'hsl(38, 92%, 50%)', fontSize: '14px', fontWeight: 'bold' }}>
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function MonthlyAnalyticsPage() {
  const { formatCurrency, formatDate, formatMonth, t } = useUser();
  const currentDate = useMemo(() => new Date(), []);

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
    queryKey: ['monthly-analytics', { year: selectedYearNumber, month: selectedMonthNumber }],
    queryFn: async () => {
      const result = await analyticsApi.getMonthly({
        year: selectedYearNumber,
        month: selectedMonthNumber
      });
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || t('common.unknownError'));
    },
    placeholderData: keepPreviousData,
  });

  const incomeBarData = useMemo(() => data?.income_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value) ?? [], [data]);

  const expenseBarData = useMemo(() => data?.expenses_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value) ?? [], [data]);

  const spendingTypeData = useMemo(() => data?.spending_type_breakdown.map((item) => ({
    name: spendingTypeLabels[item.type as keyof typeof spendingTypeLabels] ?? item.type,
    value: Number(item.amount),
  })) ?? [], [data, spendingTypeLabels]);

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
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.monthlyAnalytics.title')}
        description={t('pages.monthlyAnalytics.description', { month: selectedMonth, year: selectedYear })}
        actions={
          <div className="flex gap-2">
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
                  <TrendingUp className="h-3 w-3 text-emerald-500" /> {t('metrics.income')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.income)}</p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.income_delta_pct >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.income_delta_pct > 0 ? '+' : ''}{data.comparison.income_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-destructive" /> {t('metrics.expenses')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.expenses)}</p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.expenses_delta_pct <= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.expenses_delta_pct > 0 ? '+' : ''}{data.comparison.expenses_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Wealth Generation */}
            <div className="flex-[1.2] grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:px-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <PiggyBank className="h-3 w-3 text-primary" /> {t('metrics.savings')}
                </p>
                <div className="flex flex-col mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.savings)}</p>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm">{data.savings_rate.toFixed(1)}%</span>
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.savings_delta_pct >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.savings_delta_pct > 0 ? '+' : ''}{data.comparison.savings_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3 text-primary" /> {t('metrics.investments')}
                </p>
                <div className="flex flex-col mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.investments)}</p>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm">{data.investment_rate.toFixed(1)}%</span>
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.investments_delta_pct >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.investments_delta_pct > 0 ? '+' : ''}{data.comparison.investments_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Outcomes */}
            <div className="flex-1 grid grid-cols-2 gap-4 xl:pl-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-primary" /> {t('metrics.profit')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.profit)}</p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.profit_delta_pct >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.profit_delta_pct > 0 ? '+' : ''}{data.comparison.profit_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <Wallet className="h-3 w-3 text-primary" /> {t('metrics.cashFlow')}
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.cashflow)}</p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.cashflow_delta_pct >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.cashflow_delta_pct > 0 ? '+' : ''}{data.comparison.cashflow_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
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
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
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
                formatter={(value: number) => [formatCurrency(value), t('metrics.spending')]}
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
                stroke="hsl(38, 92%, 50%)"
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
        {/* Income Breakdown Bar Chart */}
        <div
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">{t('pages.monthlyAnalytics.incomeSources')}</h3>
          <div className="h-[300px]">
            {incomeBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incomeBarData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  barCategoryGap={30}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 }}
                    dy={10}
                    interval={0}
                  />
                  <YAxis hide={true} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => formatCurrency(v).replace(/(\.|,)00(?=\D*$)/, '')}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }}
                    />
                    {incomeBarData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" opacity={Math.max(0.3, 0.9 - index * 0.15)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={spendingTypeData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  barCategoryGap={30}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 }}
                    dy={10}
                    interval={0}
                  />
                  <YAxis hide={true} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => formatCurrency(v).replace(/(\.|,)00(?=\D*$)/, '')}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }}
                    />
                    {spendingTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--muted-foreground))" opacity={Math.max(0.4, 0.9 - index * 0.2)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t('pages.monthlyAnalytics.noSpendingTypeData')}</div>
            )}
          </div>
        </div>
      </DeferredRender>

      {/* Full Width Grid: Expense Categories */}
      <DeferredRender
        className="grid gap-6 lg:grid-cols-1"
        fallback={<div className="min-h-[348px] rounded-xl border border-border/50 bg-card" />}
      >
        <div
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">{t('pages.monthlyAnalytics.expenseCategories')}</h3>
          <div className="h-[300px]">
            {expenseBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseBarData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  barCategoryGap={20}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.7 }}
                    dy={10}
                    interval={0}
                  />
                  <YAxis hide={true} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => formatCurrency(v).replace(/(\.|,)00(?=\D*$)/, '')}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }}
                    />
                    {expenseBarData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--muted-foreground))" opacity={Math.max(0.2, 0.8 - index * 0.05)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t('pages.monthlyAnalytics.noExpenseData')}</div>
            )}
          </div>
        </div>
      </DeferredRender>
    </div>
  );
}
