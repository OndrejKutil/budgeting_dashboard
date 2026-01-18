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
      value: item.total,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const incomeBarData = data.income_breakdown
    .map((item) => ({ name: item.category, value: item.total }))
    .sort((a, b) => b.value - a.value);

  const expenseBarData = data.expenses_breakdown
    .map((item) => ({ name: item.category, value: item.total }))
    .sort((a, b) => b.value - a.value);

  const spendingTypeData = data.spending_type_breakdown.map((item) => ({
    name: item.type,
    value: item.amount,
  }));

  const dailyData = data.daily_spending_heatmap.map((item) => ({
    day: new Date(item.day).getDate(),
    fullDate: item.day,
    amount: item.amount,
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

      {/* Daily Spending Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <h3 className="mb-4 text-lg font-semibold font-display">Daily Spending</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(217, 19%, 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Spending']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate;
                  }
                  return `Day ${label}`;
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(239, 84%, 67%)"
                strokeWidth={2}
                fill="url(#spendingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>


      {/* Pie Chart & Spending Type Row (Moved up) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown (Pie) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 text-lg font-semibold font-display">Expense Distribution</h3>
          <div className="flex items-center gap-6">
            <div className="h-48 w-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip formatCurrency={formatCurrency} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 max-h-48 overflow-y-auto">
              {expensePieData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm truncate max-w-[120px]" title={cat.name}>{cat.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Spending Type Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 text-lg font-semibold font-display">Spending Type Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTypeData} layout="vertical" barCategoryGap={16}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 9%)',
                    border: '1px solid hsl(217, 19%, 20%)',
                    borderRadius: '8px',
                    color: 'hsl(210, 40%, 98%)',
                  }}
                  itemStyle={{ color: 'hsl(239, 84%, 67%)' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {spendingTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(239, 84%, ${67 - index * 8}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Income/Expense Breakdown Rows (Moved down & Vertical) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Breakdown Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 text-lg font-semibold font-display">Income Breakdown</h3>
          <div className="h-[400px]">
            {incomeBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incomeBarData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                  />
                  <YAxis
                    hide={true} // Hide Y axis for cleaner look as bars are labeled or clear enough
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(217, 19%, 20%)', opacity: 0.5 }}
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" fill="hsl(239, 84%, 67%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No income data</div>
            )}
          </div>
        </motion.div>

        {/* Expenses Breakdown Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 text-lg font-semibold font-display">Expenses Breakdown</h3>
          <div className="h-[400px]">
            {expenseBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseBarData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                  />
                  <YAxis
                    hide={true}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(217, 19%, 20%)', opacity: 0.5 }}
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" fill="hsl(239, 84%, 67%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No expense data</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
