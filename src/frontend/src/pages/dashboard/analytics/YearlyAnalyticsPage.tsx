import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
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
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { DeferredRender } from '@/components/performance/DeferredRender';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';



// Constants for charts
const COLORS = [
  'hsl(239, 84%, 67%)', // Primary Blurple
  'hsl(168, 84%, 42%)', // Success Green
  'hsl(38, 92%, 50%)',  // Warning Yellow
  'hsl(280, 67%, 60%)', // Purple
  'hsl(215, 14%, 64%)', // Gray
  'hsl(0, 84%, 60%)',   // Destructive Red
];

const PIE_COLORS = [
  'hsl(185, 70%, 45%)', // Primary teal
  'hsl(175, 70%, 42%)',
  'hsl(38, 80%, 55%)',
  'hsl(142, 71%, 45%)',
  'hsl(195, 20%, 60%)',
  'hsl(0, 84%, 60%)',
];

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};



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
        <p style={{ color: 'hsl(185, 70%, 45%)', fontSize: '14px', fontWeight: 'bold' }}>
          <SensitiveValue>{formatCurrency(data.value)}</SensitiveValue>
        </p>
      </div>
    );
  }
  return null;
};

export default function YearlyAnalyticsPage() {
  const { formatCurrency, t } = useUser();
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
    queryKey: ['yearly-analytics', selectedYearNumber],
    queryFn: async () => {
      const response = await analyticsApi.getYearly({ year: selectedYearNumber });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || t('common.unknownError'));
    },
    placeholderData: keepPreviousData,
  });

  const monthlyTrendsData = useMemo(() => data?.months.map((month, index) => {
    const income = data.monthly_income[index] || 0;
    const savings = data.monthly_saving[index] || 0;
    const investments = data.monthly_investment[index] || 0;

    return {
      month,
      income: income,
      expenses: data.monthly_expense[index] || 0,
      savings: savings,
      investments: investments,
      savingsRate: income > 0 ? (savings / income) * 100 : 0,
      investmentRate: income > 0 ? (investments / income) * 100 : 0,
    };
  }) ?? [], [data]);

  const spendingTypeData = useMemo(() => data?.months.map((month, index) => ({
    month,
      Core: data.monthly_core_expense[index] || 0,
      Fun: data.monthly_fun_expense[index] || 0,
      Future: data.monthly_future_expense[index] || 0,
  })) ?? [], [data]);

  const categoryBreakdownData = useMemo(() => Object.entries(data?.expense_by_category ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8), [data]);

  const balanceData = useMemo(() => {
    if (!data) return [];

    return [
      { name: t('types.core'), value: data.spending_balance.core_share_pct, color: 'hsl(185, 70%, 45%)' },
      { name: t('types.fun'), value: data.spending_balance.fun_share_pct, color: 'hsl(340, 65%, 55%)' },
      { name: t('types.future'), value: data.spending_balance.future_share_pct, color: 'hsl(38, 80%, 55%)' },
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.yearlyAnalytics.title')}
        description={t('pages.yearlyAnalytics.description', { year: selectedYear })}
        actions={
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
        }
      />

      <div className="space-y-8">
        {/* Unified Financial Header with Inline Trends */}
        <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm mb-4">
          {/* Core Flows */}
          <div className="flex-1 grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:pr-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> {t('metrics.income')}
              </p>
              <div className="flex flex-col mt-1">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.total_income)}</SensitiveValue></p>
                <div className="flex items-center gap-1 mt-1">
                  {data.trend_directions?.income_trend?.direction === 'growing' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : data.trend_directions?.income_trend?.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-blue-400" />}
                  <span className={`text-[10px] font-medium ${data.trend_directions?.income_trend?.direction === 'growing' ? 'text-emerald-500' : data.trend_directions?.income_trend?.direction === 'declining' ? 'text-destructive' : 'text-blue-400'}`}>
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
                  {data.trend_directions?.core_expense_trend?.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-emerald-500" /> : data.trend_directions?.core_expense_trend?.direction === 'growing' ? <TrendingUp className="h-3 w-3 text-amber-500" /> : <Minus className="h-3 w-3 text-blue-400" />}
                  <span className={`text-[10px] font-medium ${data.trend_directions?.core_expense_trend?.direction === 'declining' ? 'text-emerald-500' : data.trend_directions?.core_expense_trend?.direction === 'growing' ? 'text-amber-500' : 'text-blue-400'}`}>
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
                <PiggyBank className="h-3 w-3 text-primary" /> {t('metrics.savings')}
              </p>
              <div className="flex flex-col mt-1">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.total_saving)}</SensitiveValue></p>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-sm"><SensitiveValue>{data.savings_rate.toFixed(1)}%</SensitiveValue></span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {data.trend_directions?.savings_rate_trend?.direction === 'growing' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : data.trend_directions?.savings_rate_trend?.direction === 'declining' ? <TrendingDown className="h-3 w-3 text-amber-500" /> : <Minus className="h-3 w-3 text-blue-400" />}
                  <span className={`text-[10px] font-medium ${data.trend_directions?.savings_rate_trend?.direction === 'growing' ? 'text-emerald-500' : data.trend_directions?.savings_rate_trend?.direction === 'declining' ? 'text-amber-500' : 'text-blue-400'}`}>
                    {data.trend_directions?.savings_rate_trend?.direction === 'growing' ? t('states.growing') : data.trend_directions?.savings_rate_trend?.direction === 'declining' ? t('states.declining') : t('states.stable')} <SensitiveValue>{(data.trend_directions?.savings_rate_trend?.avg_monthly_change_pct ?? 0) > 0 ? '+' : ''}{data.trend_directions?.savings_rate_trend?.avg_monthly_change_pct ?? 0}%/mo</SensitiveValue>
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-primary" /> {t('metrics.investments')}
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
                <DollarSign className="h-3 w-3 text-primary" /> {t('metrics.profit')}
              </p>
              <div className="flex flex-col mt-1">
                <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight"><SensitiveValue>{formatCurrency(data.profit)}</SensitiveValue></p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-primary" /> {t('metrics.cashFlow')}
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
              <div className="text-sm font-medium text-emerald-500">
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
            <div className={`h-80 ${sensitiveChartClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendsData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }} onClick={(e) => e?.activeLabel && handleMonthClick(e.activeLabel)} style={{ cursor: 'pointer' }}>
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
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')}
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
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name={t('metrics.expenses')}
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Wealth Generation Chart */}
          <div
            className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold font-display">{t('pages.yearlyAnalytics.wealthGeneration')}</h3>
                <p className="text-sm text-muted-foreground">{t('pages.yearlyAnalytics.savingsInvestments')} · <span className="text-primary/70">{t('pages.yearlyAnalytics.clickBar')}</span></p>
              </div>
            </div>
            <div className={`h-80 ${sensitiveChartClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendsData} barGap={4} barSize={18} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={(e) => e?.activeLabel && handleMonthClick(e.activeLabel)} style={{ cursor: 'pointer' }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')}
                    domain={leftDomain}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    width={30}
                    tickMargin={5}
                    domain={rightDomain}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '0.5rem' }}
                    formatter={(value: number, name: string) => {
                      if (name.includes('Rate')) {
                        return [<SensitiveValue key="value">{value.toFixed(2)}%</SensitiveValue>, name];
                      }
                      return [<SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>, name];
                    }}
                  />
                  <Legend iconType="circle" />
                  <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <Bar yAxisId="left" dataKey="savings" name={t('metrics.savings')} fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} opacity={0.9} />
                  <Bar yAxisId="left" dataKey="investments" name={t('metrics.investments')} fill="hsl(280, 67%, 60%)" radius={[4, 4, 0, 0]} opacity={0.9} />
                  {/* Rate Lines */}
                  <Line yAxisId="right" type="monotone" dataKey="savingsRate" name={t('pages.yearlyAnalytics.savingsRateShort')} stroke="hsl(199, 70%, 68%)" strokeWidth={2.5} dot={false} strokeDasharray="4 4" />
                  <Line yAxisId="right" type="monotone" dataKey="investmentRate" name={t('pages.yearlyAnalytics.investmentRateShort')} stroke="hsl(280, 50%, 75%)" strokeWidth={2.5} dot={false} strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DeferredRender>


        {/* Composition Section */}
        <DeferredRender className="mt-12 pt-8" fallback={<div className="min-h-[420px] rounded-xl border border-border/50 bg-card" />}>
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-6">{t('pages.yearlyAnalytics.compositionBalance')}</h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-semibold font-display">{t('pages.yearlyAnalytics.expenseDistribution')}</h3>
              <div className={`h-[300px] flex items-center justify-center ${sensitiveChartClass}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {categoryBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spending Balance & Type Analysis */}
            <div className="space-y-6">
              {/* Balance Stats */}
              <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold font-display">{t('pages.yearlyAnalytics.spendingBalance')}</h3>
                <div className="flex items-center justify-around">
                  {balanceData.map((item) => (
                    <div key={item.name} className="text-center">
                      <div className="text-2xl font-bold" style={{ color: item.color }}>
                        <SensitiveValue>{item.value.toFixed(1)}%</SensitiveValue>
                      </div>
                      <div className="text-sm text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-3 w-full rounded-full bg-secondary/50 overflow-hidden flex">
                  {balanceData.map((item) => (
                    <div
                      key={item.name}
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      className="h-full"
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
                      <XAxis dataKey="month" hide />
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
                      <Bar dataKey="Core" name={t('types.core')} stackId="a" fill="hsl(185, 70%, 45%)" radius={[0, 0, 0, 0]} opacity={0.9} />
                      <Bar dataKey="Fun" name={t('types.fun')} stackId="a" fill="hsl(340, 65%, 55%)" opacity={0.9} />
                      <Bar dataKey="Future" name={t('types.future')} stackId="a" fill="hsl(38, 80%, 55%)" radius={[4, 4, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </DeferredRender>
      </div>
    </div>
  );
}
