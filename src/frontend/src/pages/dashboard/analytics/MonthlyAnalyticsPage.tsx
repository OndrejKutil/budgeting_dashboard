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
  LabelList,
} from 'recharts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/client';
import { MonthlyAnalytics } from '@/lib/api/types';



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

      {/* Unified Financial Header */}
      {(() => {
        const prevDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 2, 1);
        const prevLabel = `vs. ${prevDate.toLocaleString('default', { month: 'short' })}`;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col xl:flex-row items-stretch justify-between gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm mb-8"
          >
            {/* Core Flows */}
            <div className="flex-1 grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:pr-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-emerald-500" /> Income
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
                  <TrendingDown className="h-3 w-3 text-destructive" /> Expenses
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
                  <PiggyBank className="h-3 w-3 text-primary" /> Savings
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
                  <Briefcase className="h-3 w-3 text-primary" /> Investments
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
                  <DollarSign className="h-3 w-3 text-primary" /> Profit
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
                  <Wallet className="h-3 w-3 text-primary" /> Cash Flow
                </p>
                <div className="flex flex-col mt-1">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{formatCurrency(data.cashflow)}</p>
                  <span className={`text-[10px] font-medium mt-1 ${data.comparison.cashflow_delta_pct >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {data.comparison.cashflow_delta_pct > 0 ? '+' : ''}{data.comparison.cashflow_delta_pct.toFixed(1)}% {prevLabel}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

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
                stroke="hsl(38, 92%, 50%)"
                strokeWidth={3}
                fill="url(#spendingGradient)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>


      {/* 2-Column Grid: Income Sources & Spending Types */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Breakdown Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Income Sources</h3>
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
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No income data recorded</div>
            )}
          </div>
        </motion.div>

        {/* Spending Type Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Spending Type Breakdown</h3>
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
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No spending type data recorded</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Full Width Grid: Expense Categories */}
      <div className="grid gap-6 lg:grid-cols-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border/50 bg-card p-6 shadow-sm"
        >
          <h3 className="mb-6 text-base font-semibold font-display tracking-tight">Expense Categories</h3>
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
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No expense data recorded</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
