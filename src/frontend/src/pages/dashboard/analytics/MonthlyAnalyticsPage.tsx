import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
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
} from 'recharts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/client';
import { MonthlyAnalytics } from '@/lib/api/types';



const COLORS = [
  'hsl(239, 84%, 67%)',
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

export default function MonthlyAnalyticsPage() {
  const { formatCurrency } = useUser();
  const currentDate = new Date();

  const [selectedYear, setSelectedYear] = useUrlState('year', currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useUrlState('month', (currentDate.getMonth() + 1).toString().padStart(2, '0'));


  // Generate years for filter (current year + 4 years)
  // TODO: Get years from API
  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - i + 2).toString());

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-analytics', { year: selectedYear, month: selectedMonth }],
    queryFn: async () => {
      const result = await analyticsApi.getMonthly({
        year: parseInt(selectedYear),
        month: parseInt(selectedMonth)
      });
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch analytics');
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">No data available for this month.</div>;
  }


  // Transform data for charts
  const expensePieData = data.expenses_breakdown
    .map((item, index) => ({
      name: item.category,
      value: Number(item.total),
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const incomeBarData = data.income_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value);

  const expenseBarData = data.expenses_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value);

  const spendingTypeData = data.spending_type_breakdown.map((item) => ({
    name: item.type,
    value: Number(item.amount),
  }));

  const dailyData = data.daily_spending_heatmap.map((item) => ({
    day: new Date(item.day).getDate(),
    fullDate: item.day,
    amount: Number(item.amount),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Analytics"
        description={`Detailed breakdown of your monthly finances for ${selectedMonth}/${selectedYear}`}
        actions={
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
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
                <SelectValue placeholder="Year" />
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

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
      >
        <KPICard title="Income" value={data.income} icon={<TrendingUp className="h-5 w-5" />} variant="income" formatter={formatCurrency} />
        <KPICard title="Expenses" value={data.expenses} icon={<TrendingDown className="h-5 w-5" />} variant="expense" formatter={formatCurrency} />
        <KPICard title="Savings" value={data.savings} icon={<PiggyBank className="h-5 w-5" />} variant="savings" formatter={formatCurrency} />
        <KPICard title="Investments" value={data.investments} icon={<Briefcase className="h-5 w-5" />} variant="investment" formatter={formatCurrency} />
        <KPICard title="Profit" value={data.profit} icon={<DollarSign className="h-5 w-5" />} formatter={formatCurrency} />
        <KPICard title="Net Cash Flow" value={data.cashflow} icon={<Wallet className="h-5 w-5" />} formatter={formatCurrency} />
      </motion.div>

      {/* Entry Ramp / Rhythm Breaker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 py-8 max-w-lg mx-auto"
      >
        <div className="h-px flex-1 bg-border/30" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Spending Dynamics</span>
        <div className="h-px flex-1 bg-border/30" />
      </motion.div>

      {/* Daily Spending Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
      >
        <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Daily Spending</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
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
                formatter={(value: number) => [formatCurrency(value), 'Spending']}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return new Date(payload[0].payload.fullDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  }
                  return `Day ${label}`;
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(239, 84%, 67%)"
                strokeWidth={3}
                fill="url(#spendingGradient)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>


      {/* Asymmetric Grid: Pie (1/3) + Bar (2/3) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Category Breakdown (Pie) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-5 rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Expense Distribution</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-48 w-48 flex-shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-medium text-muted-foreground/50">BY CATEGORY</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {expensePieData.slice(0, 6).map((cat, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate" title={cat.name}>{cat.name}</span>
                  </div>
                  <span className="text-xs font-mono font-medium">{formatCurrency(cat.value)}</span>
                </div>
              ))}
              {expensePieData.length > 6 && (
                <div className="pt-2 text-[10px] text-center text-muted-foreground italic">
                  + {expensePieData.length - 6} more categories
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Spending Type Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-7 rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Spending Type Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTypeData} layout="vertical" barCategoryGap={12} margin={{ left: 0, right: 30 }}>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: 0.6 }}
                  tickFormatter={(v) => formatCurrency(v).replace(/(\.|,)00(?=\D*$)/, '')}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  itemStyle={{ color: 'hsl(239, 84%, 67%)' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={32}>
                  {spendingTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(239, 84%, ${67 - index * 6}%)`} opacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Income/Expense Breakdown Rows */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Breakdown Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Income Sources</h3>
          <div className="h-[300px]">
            {incomeBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incomeBarData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                  <YAxis
                    hide={true}
                  />
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
                  <Bar dataKey="value" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No income data recorded</div>
            )}
          </div>
        </motion.div>

        {/* Expenses Breakdown Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Expense Categories</h3>
          <div className="h-[300px]">
            {expenseBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseBarData.slice(0, 8)} // Limit to top 8 to reduce clutter
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                  <YAxis
                    hide={true}
                  />
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
                  <Bar dataKey="value" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No expense data recorded</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
