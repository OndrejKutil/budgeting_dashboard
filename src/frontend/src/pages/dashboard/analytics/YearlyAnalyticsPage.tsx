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
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { useState } from 'react';

const monthlyTrends = [
  { month: 'Jan', income: 7500, expenses: 3100, savings: 1800 },
  { month: 'Feb', income: 7800, expenses: 3300, savings: 1900 },
  { month: 'Mar', income: 8100, expenses: 2900, savings: 2200 },
  { month: 'Apr', income: 7900, expenses: 3500, savings: 1700 },
  { month: 'May', income: 8300, expenses: 3200, savings: 2100 },
  { month: 'Jun', income: 8000, expenses: 3400, savings: 1900 },
  { month: 'Jul', income: 8200, expenses: 3100, savings: 2300 },
  { month: 'Aug', income: 8500, expenses: 3600, savings: 2000 },
  { month: 'Sep', income: 8100, expenses: 3000, savings: 2400 },
  { month: 'Oct', income: 8400, expenses: 3300, savings: 2100 },
  { month: 'Nov', income: 8700, expenses: 3200, savings: 2500 },
  { month: 'Dec', income: 9000, expenses: 4000, savings: 2200 },
];

const quarterlyData = [
  { quarter: 'Q1', income: 23400, expenses: 9300 },
  { quarter: 'Q2', income: 24200, expenses: 10100 },
  { quarter: 'Q3', income: 24800, expenses: 9700 },
  { quarter: 'Q4', income: 26100, expenses: 10500 },
];

export default function YearlyAnalyticsPage() {
  const [selectedYear, setSelectedYear] = useState('2025');

  const totalIncome = monthlyTrends.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = monthlyTrends.reduce((sum, m) => sum + m.expenses, 0);
  const totalSavings = monthlyTrends.reduce((sum, m) => sum + m.savings, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yearly Analytics"
        description="Annual financial overview and trends"
        actions={
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Annual KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <KPICard title="Total Income" value={totalIncome} icon={<TrendingUp className="h-5 w-5" />} variant="income" />
        <KPICard title="Total Expenses" value={totalExpenses} icon={<TrendingDown className="h-5 w-5" />} variant="expense" />
        <KPICard title="Total Savings" value={totalSavings} icon={<PiggyBank className="h-5 w-5" />} variant="savings" />
        <KPICard title="Investments" value={18000} icon={<Briefcase className="h-5 w-5" />} variant="investment" />
        <KPICard title="Annual Profit" value={totalIncome - totalExpenses} icon={<DollarSign className="h-5 w-5" />} />
        <KPICard title="Savings Rate" value="26%" icon={<Wallet className="h-5 w-5" />} />
      </motion.div>

      {/* Monthly Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <h3 className="mb-4 text-lg font-semibold font-display">Monthly Income vs Expenses</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrends}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(217, 19%, 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} name="Expenses" />
              <Line type="monotone" dataKey="savings" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={false} name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quarterly Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <h3 className="mb-4 text-lg font-semibold font-display">Quarterly Comparison</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterlyData} barCategoryGap={24}>
              <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(217, 19%, 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend />
              <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
