import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard, KPICardSkeleton } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Briefcase,
  ArrowRight,
  BarChart3,
  Receipt,
  Calendar,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// Mock data for demo
const monthlyData = [
  { name: 'Week 1', income: 2100, expenses: 850 },
  { name: 'Week 2', income: 1800, expenses: 920 },
  { name: 'Week 3', income: 2400, expenses: 780 },
  { name: 'Week 4', income: 2150, expenses: 1100 },
];

const categoryData = [
  { name: 'Housing', value: 1200, color: 'hsl(239, 84%, 67%)' },
  { name: 'Food', value: 450, color: 'hsl(168, 84%, 42%)' },
  { name: 'Transport', value: 280, color: 'hsl(38, 92%, 50%)' },
  { name: 'Entertainment', value: 180, color: 'hsl(280, 67%, 60%)' },
  { name: 'Other', value: 240, color: 'hsl(215, 14%, 64%)' },
];

const spendingTypeData = [
  { name: 'Core', value: 45 },
  { name: 'Necessary', value: 25 },
  { name: 'Fun', value: 18 },
  { name: 'Future', value: 12 },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardOverview() {
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Overview"
        description={`Financial summary for ${currentMonth}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/transactions">
                <Receipt className="mr-2 h-4 w-4" />
                Transactions
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-gradient-blurple hover:opacity-90">
              <Link to="/dashboard/analytics/monthly">
                <BarChart3 className="mr-2 h-4 w-4" />
                Full Analytics
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={fadeIn}>
          <KPICard
            title="Income"
            value={8450}
            change={12.5}
            changeLabel="vs last month"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="income"
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Expenses"
            value={3240}
            change={-5.2}
            changeLabel="vs last month"
            icon={<TrendingDown className="h-5 w-5" />}
            variant="expense"
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Savings"
            value={2100}
            change={8.3}
            changeLabel="vs last month"
            icon={<PiggyBank className="h-5 w-5" />}
            variant="savings"
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Investments"
            value={1500}
            change={15.0}
            changeLabel="vs last month"
            icon={<Briefcase className="h-5 w-5" />}
            variant="investment"
          />
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income vs Expenses Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-display">Income vs Expenses</h3>
              <p className="text-sm text-muted-foreground">Weekly breakdown this month</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/analytics/monthly">
                Details <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 9%)',
                    border: '1px solid hsl(217, 19%, 20%)',
                    borderRadius: '8px',
                    color: 'hsl(210, 40%, 98%)',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                  name="Income"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-display">Spending by Category</h3>
              <p className="text-sm text-muted-foreground">Where your money goes</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/categories">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-48 w-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
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
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {categoryData.map((category, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium">${category.value}</span>
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
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-display">Spending Type Breakdown</h3>
            <p className="text-sm text-muted-foreground">Core vs Necessary vs Fun vs Future</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendingTypeData} layout="vertical" barCategoryGap={12}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(217, 19%, 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {spendingTypeData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(239, 84%, ${67 - index * 10}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <Link
          to="/dashboard/transactions"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-glow-sm"
        >
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">View Transactions</div>
            <div className="text-sm text-muted-foreground">Manage all your transactions</div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          to="/dashboard/analytics/yearly"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-glow-sm"
        >
          <div className="rounded-lg bg-chart-teal/10 p-3 text-chart-teal">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Yearly Analytics</div>
            <div className="text-sm text-muted-foreground">Long-term trends & insights</div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          to="/dashboard/funds"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-glow-sm"
        >
          <div className="rounded-lg bg-chart-investment/10 p-3 text-chart-investment">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Savings Funds</div>
            <div className="text-sm text-muted-foreground">Track your savings goals</div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </div>
  );
}
