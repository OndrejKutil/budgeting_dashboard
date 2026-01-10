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
import { useUser } from '@/contexts/UserContext';

// Mock data
const dailySpending = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  amount: Math.floor(Math.random() * 200) + 20,
}));

const categoryBreakdown = [
  { name: 'Housing', value: 1800, color: 'hsl(239, 84%, 67%)' },
  { name: 'Food', value: 450, color: 'hsl(168, 84%, 42%)' },
  { name: 'Transport', value: 280, color: 'hsl(38, 92%, 50%)' },
  { name: 'Entertainment', value: 180, color: 'hsl(280, 67%, 60%)' },
  { name: 'Utilities', value: 200, color: 'hsl(199, 89%, 48%)' },
  { name: 'Other', value: 240, color: 'hsl(215, 14%, 64%)' },
];

const spendingType = [
  { name: 'Core', value: 2200, percentage: 45 },
  { name: 'Necessary', value: 980, percentage: 20 },
  { name: 'Fun', value: 490, percentage: 10 },
  { name: 'Future', value: 1230, percentage: 25 },
];

export default function MonthlyAnalyticsPage() {
  const { formatCurrency } = useUser();
  const [selectedMonth, setSelectedMonth] = useState('january');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Analytics"
        description="Detailed breakdown of your monthly finances"
        actions={
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="january">January 2026</SelectItem>
              <SelectItem value="december">December 2025</SelectItem>
              <SelectItem value="november">November 2025</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <KPICard title="Income" value={8450} icon={<TrendingUp className="h-5 w-5" />} variant="income" formatter={formatCurrency} />
        <KPICard title="Expenses" value={3240} icon={<TrendingDown className="h-5 w-5" />} variant="expense" formatter={formatCurrency} />
        <KPICard title="Savings" value={2100} icon={<PiggyBank className="h-5 w-5" />} variant="savings" formatter={formatCurrency} />
        <KPICard title="Investments" value={1500} icon={<Briefcase className="h-5 w-5" />} variant="investment" formatter={formatCurrency} />
        <KPICard title="Profit" value={5210} icon={<DollarSign className="h-5 w-5" />} formatter={formatCurrency} />
        <KPICard title="Net Cash Flow" value={3110} icon={<Wallet className="h-5 w-5" />} formatter={formatCurrency} />
      </motion.div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Spending Heatmap / Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 text-lg font-semibold font-display">Daily Spending</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySpending}>
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 9%)',
                    border: '1px solid hsl(217, 19%, 20%)',
                    borderRadius: '8px',
                    color: 'hsl(210, 40%, 98%)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Spending']}
                  labelFormatter={(label) => `Day ${label}`}
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

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 text-lg font-semibold font-display">Category Breakdown</h3>
          <div className="flex items-center gap-6">
            <div className="h-48 w-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryBreakdown.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

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
            <BarChart data={spendingType} layout="vertical" barCategoryGap={16}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(217, 19%, 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {spendingType.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(239, 84%, ${67 - index * 8}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
