import { useEffect, useState } from 'react';
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
} from 'recharts';
import { useUser } from '@/contexts/UserContext';
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
  const [data, setData] = useState<YearlyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Determine available years (mock for now, or could come from API if available)
  const years = [2026, 2025, 2024, 2023];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await analyticsApi.getYearly({ year: parseInt(selectedYear) });
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.message || 'Failed to load yearly analytics');
        }
      } catch (err) {
        setError('An error occurred while fetching yearly analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

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
        <p className="text-destructive">{error || 'No data available'}</p>
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
        className="space-y-6"
      >
        {/* Top KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Income"
              value={data.total_income}
              icon={<TrendingUp className="h-5 w-5" />}
              variant="income"
              formatter={formatCurrency}
              className="h-full"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Expenses"
              value={data.total_expense}
              icon={<TrendingDown className="h-5 w-5" />}
              variant="expense"
              formatter={formatCurrency}
              className="h-full"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Total Savings"
              value={data.total_saving}
              icon={<PiggyBank className="h-5 w-5" />}
              variant="savings"
              formatter={formatCurrency}
              className="h-full"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Investments"
              value={data.total_investment}
              icon={<Briefcase className="h-5 w-5" />}
              variant="investment"
              formatter={formatCurrency}
              className="h-full"
            />
          </motion.div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants}>
            <KPICard
              title="Profit"
              value={data.profit}
              icon={<Wallet className="h-5 w-5" />}
              variant="default"
              formatter={formatCurrency}
              className="h-full"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Net Cash Flow"
              value={data.net_cash_flow}
              icon={<Activity className="h-5 w-5" />}
              variant="default"
              formatter={formatCurrency}
              className="h-full"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Savings Rate"
              value={`${data.savings_rate.toFixed(1)}%`}
              icon={<Target className="h-5 w-5" />}
              variant="default"
              className="h-full"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KPICard
              title="Investment Rate"
              value={`${data.investment_rate.toFixed(1)}%`}
              icon={<Zap className="h-5 w-5" />}
              variant="default"
              className="h-full"
            />
          </motion.div>
        </div>

        {/* Highlights & Volatility */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Highlights */}
          <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 text-lg font-semibold font-display flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Yearly Highlights
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <div className="text-sm text-muted-foreground mb-1">Best Month (Cashflow)</div>
                <div className="text-xl font-bold text-primary">{data.highlights.highest_cashflow_month.month}</div>
                <div className="text-sm font-semibold text-primary/80">
                  {formatCurrency(data.highlights.highest_cashflow_month.value)}
                </div>
              </div>
              <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/10">
                <div className="text-sm text-muted-foreground mb-1">Highest Expenses</div>
                <div className="text-xl font-bold text-destructive">{data.highlights.highest_expense_month.month}</div>
                <div className="text-sm font-semibold text-destructive/80">
                  {formatCurrency(data.highlights.highest_expense_month.value)}
                </div>
              </div>
              <div className="bg-chart-cyan/5 rounded-lg p-4 border border-chart-cyan/10">
                <div className="text-sm text-muted-foreground mb-1">Best Savings Rate</div>
                <div className="text-xl font-bold text-chart-cyan">{data.highlights.highest_savings_rate_month.month}</div>
                <div className="text-sm font-semibold text-chart-cyan/80">
                  {data.highlights.highest_savings_rate_month.value.toFixed(1)}%
                </div>
              </div>
            </div>
          </motion.div>

          {/* Volatility */}
          <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 text-lg font-semibold font-display flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Volatility (Std Dev)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Measures how consistent your income and expenses are month-to-month. A full bar means perfectly stable amounts.
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Income Stability</span>
                  <span className="font-medium text-foreground">{formatCurrency(data.volatility.income_volatility)}</span>
                </div>
                {(() => {
                  const avgIncome = data.total_income / Math.max(1, data.months.length);
                  // Coefficient of variation (CV) = StdDev / Mean
                  const incomeCv = avgIncome > 0 ? (data.volatility.income_volatility / avgIncome) : 0;
                  // Stability score: 100% - CV%. Clamped to [5%, 100%].
                  const incomeStability = Math.max(5, Math.min(100, (1 - incomeCv) * 100));

                  return (
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 opacity-80 transition-all duration-500"
                        style={{ width: `${incomeStability}%` }}
                      ></div>
                    </div>
                  );
                })()}
                <div className="text-xs text-muted-foreground mt-1">Consistency of monthly income</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Expense Consistency</span>
                  <span className="font-medium text-foreground">{formatCurrency(data.volatility.expense_volatility)}</span>
                </div>
                {(() => {
                  const avgExpense = data.total_expense / Math.max(1, data.months.length);
                  const expenseCv = avgExpense > 0 ? (data.volatility.expense_volatility / avgExpense) : 0;
                  const expenseStability = Math.max(5, Math.min(100, (1 - expenseCv) * 100));

                  return (
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 opacity-80 transition-all duration-500"
                        style={{ width: `${expenseStability}%` }}
                      ></div>
                    </div>
                  );
                })()}
                <div className="text-xs text-muted-foreground mt-1">Consistency of monthly expenses</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Income vs Expenses Chart */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold font-display">Income & Usage</h3>
                <p className="text-sm text-muted-foreground">Monthly income vs expenses trend</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
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
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Wealth Generation Chart */}
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold font-display">Wealth Generation</h3>
                <p className="text-sm text-muted-foreground">Savings & Investments (Abs & %)</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    width={60}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ color: 'hsl(210, 40%, 98%)', marginBottom: '0.5rem' }}
                    formatter={(value: number, name: string) => {
                      if (name.includes('Rate')) {
                        return [`${value.toFixed(2)}%`, name];
                      }
                      return [formatCurrency(value), name];
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar yAxisId="left" dataKey="savings" name="Savings" fill="hsl(199, 89%, 48%)" stackId="a" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="investments" name="Investments" fill="hsl(280, 67%, 60%)" stackId="a" radius={[4, 4, 0, 0]} barSize={20} />

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="savingsRate"
                    name="Savings Rate"
                    stroke="hsl(199, 89%, 48%)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="investmentRate"
                    name="Invest. Rate"
                    stroke="hsl(280, 67%, 60%)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Bottom Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Category Breakdown */}
          <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 text-lg font-semibold font-display">Expense Distribution</h3>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Spending Balance & Type Analysis */}
          <motion.div variants={itemVariants} className="space-y-6">

            {/* Balance Stats */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 text-lg font-semibold font-display">Spending Balance</h3>
              <div className="flex items-center justify-around">
                {balanceData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">{item.name}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-4 w-full rounded-full bg-secondary overflow-hidden flex">
                {balanceData.map((item) => (
                  <div
                    key={item.name}
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    className="h-full"
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-center text-muted-foreground">
                Target: 50% Core / 30% Fun / 20% Future
              </div>
            </div>

            {/* Spending Type Trend */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 text-lg font-semibold font-display">Spending Type History (100% Stacked)</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingTypeData} stackOffset="expand">
                    <XAxis dataKey="month" hide />
                    <YAxis
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        border: '1px solid hsl(217, 19%, 20%)',
                        borderRadius: '8px',
                        color: 'hsl(210, 40%, 98%)'
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="Core" stackId="a" fill="hsl(239, 84%, 67%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Fun" stackId="a" fill="hsl(168, 84%, 42%)" />
                    <Bar dataKey="Future" stackId="a" fill="hsl(280, 67%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
