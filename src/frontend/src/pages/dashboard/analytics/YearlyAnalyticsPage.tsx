import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
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
  Wallet,
  Calendar,
  Activity,
  Target,
  Zap,
  Info,
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
import { analyticsApi } from '@/lib/api/client';
import type { YearlyAnalyticsData } from '@/lib/api/types';



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
  'hsl(239, 84%, 67%)',
  'hsl(168, 84%, 42%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
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
        backgroundColor: 'hsl(222, 47%, 9%)',
        border: '1px solid hsl(217, 19%, 20%)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}>
        <p style={{ color: 'hsl(210, 40%, 98%)', fontSize: '12px', marginBottom: '2px' }}>
          {data.name}
        </p>
        <p style={{ color: 'hsl(239, 84%, 67%)', fontSize: '14px', fontWeight: 'bold' }}>
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function YearlyAnalyticsPage() {
  const { formatCurrency } = useUser();
  const [selectedYear, setSelectedYear] = useUrlState('year', new Date().getFullYear().toString());

  // TODO: Get years from API
  const years = [2028, 2027, 2026, 2025];

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['yearly-analytics', selectedYear],
    queryFn: async () => {
      const response = await analyticsApi.getYearly({ year: parseInt(selectedYear) });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to load yearly analytics');
    },
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error instanceof Error ? error.message : 'No data available'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Transform data for charts
  const monthlyTrendsData = data.months.map((month, index) => {
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
  });

  const spendingTypeData = data.months.map((month, index) => ({
    month,
    Core: data.monthly_core_expense[index] || 0,
    Fun: data.monthly_fun_expense[index] || 0,
    Future: data.monthly_future_expense[index] || 0,
  }));

  const categoryBreakdownData = Object.entries(data.expense_by_category)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 categories

  const balanceData = [
    { name: 'Core', value: data.spending_balance.core_share_pct, color: 'hsl(239, 84%, 67%)' },
    { name: 'Fun', value: data.spending_balance.fun_share_pct, color: 'hsl(168, 84%, 42%)' },
    { name: 'Future', value: data.spending_balance.future_share_pct, color: 'hsl(280, 67%, 60%)' },
  ].filter(d => d.value > 0);

  // Synchronize zero lines for dual-axis chart
  const { left: leftDomain, right: rightDomain } = (() => {
    const keysLeft = ['savings', 'investments'];
    const keysRight = ['savingsRate', 'investmentRate'];

    const minLeft = Math.min(...monthlyTrendsData.map(d => Math.min(...keysLeft.map(k => d[k] || 0))), 0);
    const maxLeft = Math.max(...monthlyTrendsData.map(d => Math.max(...keysLeft.map(k => d[k] || 0))), 0);
    const minRight = Math.min(...monthlyTrendsData.map(d => Math.min(...keysRight.map(k => d[k] || 0))), 0);
    const maxRight = Math.max(...monthlyTrendsData.map(d => Math.max(...keysRight.map(k => d[k] || 0))), 0);

    // Calculate "positive-heaviness" ratio for both. Formula: max / (max - min)
    // 1.0 = All positive (min=0). 0.0 = All negative (max=0).
    // ratio = height above zero / total height.
    // We need to pick the smallest ratio (meaning the one that needs the MOST negative space) to accommodate both.

    const rangeLeft = maxLeft - minLeft;
    const rangeRight = maxRight - minRight;

    // Default to strict [min, max] first
    let lMin = minLeft, lMax = maxLeft;
    let rMin = minRight, rMax = maxRight;

    if (rangeLeft > 0 && rangeRight > 0) {
      // Calculate the "zero line position" from bottom (0.0 to 1.0)
      // pos = -min / (max - min). 
      // 0 is at bottom if min=0.
      const zeroPosLeft = -minLeft / rangeLeft;
      const zeroPosRight = -minRight / rangeRight;

      // We need a common zero position that satisfies BOTH requirements without cutting data.
      // To satisfy a required Z, we must ensure:
      // -min / (max - min) = Z  => -min = Z*max - Z*min => -min(1-Z) = Z*max => |min| = max * Z / (1-Z)

      // We pick the LARGEST zeroPos (highest zero line) required by either dataset.
      // Example: Left needs 0.2 (mostly positive). Right needs 0.8 (mostly negative).
      // If we choose 0.2, Right's negative data (-8) would need huge positive space (32) to make -8 represent 20% of range. 
      // If we choose 0.8, Left's positive data (10) would need huge negative space (-40) to make 0 at 80% height.
      // Actually, to display strictly, we should just take specific domains that cover data.
      // But to SYNC them, we need specific padding.

      const targetZeroPos = Math.max(zeroPosLeft, zeroPosRight);

      // Adjust Left Domain
      // If targetZ > currentZ, we need to add negative space (extend min).
      // If targetZ < currentZ, we need to add positive space (extend max).
      // Since we picked max(), targetZ >= currentZ is practically guaranteed if we consider extending 'min' is the way to raise zero line.
      // BUT wait. 
      // range = max + |min|. 
      // zeroPos = |min| / range.
      // If we want HIGHER zeroPos, we need LARGER |min| portion. 
      // So we satisfy the requirement by extending |min|.
      // New|min| = max * targetZ / (1 - targetZ).

      // Check both bounds for Left
      const reqAbsMinLeft = lMax * targetZeroPos / (1 - targetZeroPos || 0.001);
      // If calculated |min| < actual |min|, then 1-targetZ was too large? No.
      // If we need Z=0.8, and data is [0, 10]. |min| must be 40.
      // If data is [-10, 0]. Z=1. |min|=10. max=0. Formula breaks if max=0?
      // if targetZ=1, reqMin -> infinity. Correct (if max>0).

      // Simpler approach:
      // We need min <= - (max * R_n / R_p).
      // Let ratio R = |min| / max.
      // We want strict equality R_left = R_right.
      // Current ratios:
      const rRatioLeft = maxLeft === 0 ? 999999 : Math.abs(minLeft) / maxLeft;
      const rRatioRight = maxRight === 0 ? 999999 : Math.abs(minRight) / maxRight;

      const targetR = Math.max(rRatioLeft, rRatioRight);

      // Apply target ratio
      // If Left has smaller ratio, we extend its Min (more negative).
      if (targetR > rRatioLeft) {
        lMin = - (maxLeft * targetR);
      } else {
        // Already big or maxLeft was 0.
        // If maxLeft=0, lMin is just minLeft. targetR handled by other axis?
        // If maxLeft=0, rRatioLeft is huge. targetR is huge.
        // If right axis was normal (max>0), we force it to have huge negative?
        // Yes, if one chart shows only negative, the other must have zero at the top too.
      }

      if (targetR > rRatioRight && maxRight > 0) {
        rMin = - (maxRight * targetR);
      }
    }

    // Now adding "Nice Number" padding to avoid Recharts auto-tick mess
    const niceScale = (min: number, max: number) => {
      const range = max - min;
      const roughStep = range / 4; // 4 ticks roughly
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const normalizedStep = roughStep / magnitude;
      let step = 1;
      if (normalizedStep > 5) step = 10;
      else if (normalizedStep > 2) step = 5;
      else if (normalizedStep > 1) step = 2;
      step *= magnitude;

      // Expand strictly outwards
      const newMax = Math.ceil(max / step) * step;
      const newMin = Math.floor(min / step) * step;
      return [newMin, newMax];
    };

    // We must ensure that after "nicing", the zero position is IDENTICAL.
    // ZeroPos = |min| / (|min| + max).
    // It's easier to Nice the "Max" (Positive side) first, then STRICTLY calculate Min from it using targetR.
    // Or Nice the "Larger" absolute side.

    // For Left:
    const [_, niceMaxLeft] = niceScale(0, lMax);
    // We use naive nicing for Max.
    const finalLMax = niceMaxLeft === 0 ? 0 : niceMaxLeft;
    // Recalculate Min to preserve ratio perfectly
    const rRatio = (Math.abs(lMin) / (lMax || 1));
    // Wait, use the targetR from before!
    // But we might have changed effective ratio if we just extended min?

    // Let's restart the "Nice" Strategy:
    // 1. Calculate 'Max' for both, round them to Nice Numbers.
    // 2. Determine implied 'Min' required to cover data AND satisfy common Ratio. No.

    // Let's stick to the simplest solid logic:
    // 1. Get loose Nice domains for both INDEPENDENTLY first.
    let [niceLMin, niceLMax] = niceScale(minLeft, maxLeft);
    let [niceRMin, niceRMax] = niceScale(minRight, maxRight);

    // 2. Ensure they encompass 0.
    niceLMax = Math.max(niceLMax, 0); niceLMin = Math.min(niceLMin, 0);
    niceRMax = Math.max(niceRMax, 0); niceRMin = Math.min(niceRMin, 0);

    // 3. Compare Ratios of these Nice Domains.
    // Ratio = |min| / max. (Undefined if max=0).
    const ratioL = niceLMax === 0 ? 1000 : Math.abs(niceLMin) / niceLMax;
    const ratioR = niceRMax === 0 ? 1000 : Math.abs(niceRMin) / niceRMax;

    const finalRatio = Math.max(ratioL, ratioR);

    // 4. Adjust the "Lighter" side to match FinalRatio.
    // If Left is lighter (smaller ratio, less negative relative to positive), extend Negative.
    if (ratioL < finalRatio) {
      // We assume Max is fixed (it's already Nice). We extend Min.
      // |min| = max * finalRatio.
      niceLMin = -niceLMax * finalRatio;
    }

    // Similarly for Right
    if (ratioR < finalRatio) {
      niceRMin = -niceRMax * finalRatio;
    }

    // Result: 
    // Max is Nice (e.g. 100). 
    // Min is derived (e.g. -50 if ratio=0.5).
    // -50 is usually also "Nice" enough because ratio effectively comes from another Nice domain.
    // (If Ratio came from 200/-100 => 0.5. Then 100/-50 works).

    return {
      left: [niceLMin, niceLMax],
      right: [niceRMin, niceRMax]
    };
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yearly Analytics"
        description={`Detailed financial analysis for ${selectedYear}`}
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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* KPI GROUPS */}
        <div className="space-y-6">
          {/* Group 1: Totals */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 block pl-1">Financial Totals</span>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div variants={itemVariants}>
                <KPICard title="Total Income" value={data.total_income} icon={<TrendingUp className="h-5 w-5" />} variant="income" formatter={formatCurrency} className="h-full bg-card/50" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <KPICard title="Total Expenses" value={data.total_expense} icon={<TrendingDown className="h-5 w-5" />} variant="expense" formatter={formatCurrency} className="h-full bg-card/50" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <KPICard title="Total Savings" value={data.total_saving} icon={<PiggyBank className="h-5 w-5" />} variant="savings" formatter={formatCurrency} className="h-full bg-card/50" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <KPICard title="Investments" value={data.total_investment} icon={<Briefcase className="h-5 w-5" />} variant="investment" formatter={formatCurrency} className="h-full bg-card/50" />
              </motion.div>
            </div>
          </div>

          {/* Group 2: Outcomes & Rates (Separated) */}
          <div className="grid gap-6 lg:grid-cols-2 pt-2">
            {/* Outcomes */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 block pl-1">Net Outcomes</span>
              <div className="grid gap-4 grid-cols-2">
                <motion.div variants={itemVariants}>
                  <KPICard title="Profit" value={data.profit} icon={<Wallet className="h-5 w-5" />} variant="default" formatter={formatCurrency} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <KPICard title="Net Cash Flow" value={data.net_cash_flow} icon={<Activity className="h-5 w-5" />} variant="default" formatter={formatCurrency} />
                </motion.div>
              </div>
            </div>

            {/* Rates */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 block pl-1">Efficiency Rates</span>
              <div className="grid gap-4 grid-cols-2">
                <motion.div variants={itemVariants}>
                  <KPICard title="Savings Rate" value={`${data.savings_rate.toFixed(1)}%`} icon={<Target className="h-5 w-5" />} variant="default" />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <KPICard title="Investment Rate" value={`${data.investment_rate.toFixed(1)}%`} icon={<Zap className="h-5 w-5" />} variant="default" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Highlights & Volatility (Framed) */}
        <div className="grid gap-6 lg:grid-cols-3 pt-4">
          {/* Highlights */}
          {/* Highlights (Redesigned) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-8 text-lg font-semibold font-display flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Yearly Records
            </h3>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Best Cashflow</span>
                <div className="mt-1">
                  <span className="text-2xl font-bold font-display tracking-tight text-foreground">{data.highlights.highest_cashflow_month.month}</span>
                </div>
                <div className="text-sm font-medium text-emerald-500">
                  +{formatCurrency(data.highlights.highest_cashflow_month.value)}
                </div>
              </div>

              <div className="flex flex-col gap-1 sm:border-l sm:border-border/50 sm:pl-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Highest Spend</span>
                <div className="mt-1">
                  <span className="text-2xl font-bold font-display tracking-tight text-foreground">{data.highlights.highest_expense_month.month}</span>
                </div>
                <div className="text-sm font-medium text-destructive">
                  -{formatCurrency(data.highlights.highest_expense_month.value)}
                </div>
              </div>

              <div className="flex flex-col gap-1 sm:border-l sm:border-border/50 sm:pl-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Top Savings Rate</span>
                <div className="mt-1">
                  <span className="text-2xl font-bold font-display tracking-tight text-foreground">{data.highlights.highest_savings_rate_month.month}</span>
                </div>
                <div className="text-sm font-medium text-primary">
                  {data.highlights.highest_savings_rate_month.value.toFixed(1)}%
                </div>
              </div>
            </div>
          </motion.div>

          {/* Volatility (Educational) */}
          <motion.div variants={itemVariants} className="rounded-xl border border-border/60 bg-card/50 p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold font-display flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Stability Analysis
            </h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Volatility measures the "bumpiness" of your finances. Lower values indicate predictable patterns.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Income Stream</div>
                  <div className="text-xs text-muted-foreground">Std Dev: {formatCurrency(data.volatility.income_volatility)}</div>
                </div>
                <div className="text-right">
                  {(() => {
                    const avgIncome = data.total_income / Math.max(1, data.months.length);
                    const cv = avgIncome > 0 ? (data.volatility.income_volatility / avgIncome) : 0;
                    if (cv < 0.1) return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">Very Stable</span>;
                    if (cv < 0.3) return <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">Moderate</span>;
                    return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">Variable</span>;
                  })()}
                </div>
              </div>

              <div className="w-full h-px bg-border/50" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Expense Pattern</div>
                  <div className="text-xs text-muted-foreground">Std Dev: {formatCurrency(data.volatility.expense_volatility)}</div>
                </div>
                <div className="text-right">
                  {(() => {
                    const avgExpense = data.total_expense / Math.max(1, data.months.length);
                    const cv = avgExpense > 0 ? (data.volatility.expense_volatility / avgExpense) : 0;
                    if (cv < 0.15) return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">Predictable</span>;
                    if (cv < 0.4) return <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">Dynamic</span>;
                    return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">Volatile</span>;
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Long Term Trends Section */}
        <div className="mt-16 mb-8 border-t border-border/40 pt-12">
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Long-term Trends</h2>
          <p className="text-muted-foreground mt-1 text-lg">Historical performance and wealth accumulation.</p>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Income vs Expenses Chart */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold font-display">Income vs Costs</h3>
                <p className="text-sm text-muted-foreground">Monthly cash flow gap</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendsData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
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
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Wealth Generation Chart */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-semibold font-display">Wealth Generation</h3>
                <p className="text-sm text-muted-foreground">Savings + Investments</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendsData} stackOffset="sign" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    tickMargin={5} // Reduced from default to tighten spacing
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
                        return [`${value.toFixed(2)}%`, name];
                      }
                      return [formatCurrency(value), name];
                    }}
                  />
                  <Legend iconType="circle" />
                  <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <Bar yAxisId="left" dataKey="savings" name="Savings" fill="hsl(199, 89%, 48%)" stackId="a" radius={[0, 0, 0, 0]} opacity={0.9} />
                  <Bar yAxisId="left" dataKey="investments" name="Investments" fill="hsl(280, 67%, 60%)" stackId="a" radius={[4, 4, 0, 0]} opacity={0.9} />
                  {/* Rate Lines with Halo Effect for Visibility */}
                  <Line yAxisId="right" type="monotone" dataKey="savingsRate" stroke="hsl(var(--card))" strokeWidth={5} dot={false} strokeDasharray="4 4" legendType="none" />
                  <Line yAxisId="right" type="monotone" dataKey="savingsRate" name="Sav. Rate" stroke="hsl(199, 89%, 48%)" strokeWidth={3} dot={false} strokeDasharray="4 4" />
                  <Line yAxisId="right" type="monotone" dataKey="investmentRate" stroke="hsl(var(--card))" strokeWidth={5} dot={false} strokeDasharray="4 4" legendType="none" />
                  <Line yAxisId="right" type="monotone" dataKey="investmentRate" name="Invest. Rate" stroke="hsl(280, 67%, 60%)" strokeWidth={3} dot={false} strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>


        {/* Composition Section */}
        <div className="mt-12 pt-8">
          <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-6">Composition & Balance</h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <motion.div variants={itemVariants} className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-semibold font-display">Expense Distribution</h3>
              <div className="h-[300px] flex items-center justify-center">
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
            </motion.div>

            {/* Spending Balance & Type Analysis */}
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Balance Stats */}
              <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold font-display">Spending Balance</h3>
                <div className="flex items-center justify-around">
                  {balanceData.map((item) => (
                    <div key={item.name} className="text-center">
                      <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toFixed(1)}%</div>
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
                  Target: 50% Core / 30% Fun / 20% Future
                </div>
              </div>

              {/* Spending Type Trend */}
              <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold font-display">Spending Type History</h3>
                <div className="h-[250px] w-full">
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
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="Core" stackId="a" fill="hsl(239, 84%, 67%)" radius={[0, 0, 0, 0]} opacity={0.9} />
                      <Bar dataKey="Fun" stackId="a" fill="hsl(168, 84%, 42%)" opacity={0.9} />
                      <Bar dataKey="Future" stackId="a" fill="hsl(280, 67%, 60%)" radius={[4, 4, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
