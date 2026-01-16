import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3,
  Receipt,
  PiggyBank,
  Wallet,
  Calendar,
  Briefcase,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { summaryApi } from '@/lib/api/client';
import type { SummaryData } from '@/lib/api/types';
import { useUser } from '@/contexts/UserContext';

// Constants for charts
const COLORS = [
  'hsl(239, 84%, 67%)',
  'hsl(168, 84%, 42%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 60%)',
  'hsl(215, 14%, 64%)',
  'hsl(0, 84%, 60%)',
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
  const { formatCurrency } = useUser();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await summaryApi.get();
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.message || 'Failed to load summary data');
        }
      } catch (err) {
        setError('An error occurred while fetching dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {/* Row 1 */}
        <motion.div variants={fadeIn}>
          <KPICard
            title="Income"
            value={data.total_income}
            change={data.comparison.income_delta_pct}
            changeLabel="vs last month"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="income"
            className="h-full"
            formatter={formatCurrency}
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Expenses"
            value={data.total_expense}
            change={data.comparison.expense_delta_pct}
            changeLabel="vs last month"
            icon={<TrendingDown className="h-5 w-5" />}
            variant="expense"
            className="h-full"
            formatter={formatCurrency}
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Savings"
            value={data.total_saving}
            change={data.comparison.saving_delta_pct}
            changeLabel="vs last month"
            icon={<PiggyBank className="h-5 w-5" />}
            variant="savings"
            className="h-full"
            formatter={formatCurrency}
          />
        </motion.div>

        {/* Row 2 */}
        <motion.div variants={fadeIn}>
          <KPICard
            title="Profit"
            value={data.profit}
            change={data.comparison.profit_delta_pct}
            changeLabel="vs last month"
            icon={<PiggyBank className="h-5 w-5" />}
            variant="savings"
            className="h-full"
            formatter={formatCurrency}
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Cashflow"
            value={data.net_cash_flow}
            change={data.comparison.cashflow_delta_pct}
            changeLabel="vs last month"
            icon={<Wallet className="h-5 w-5" />}
            variant="investment"
            className="h-full"
            formatter={formatCurrency}
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <KPICard
            title="Investments"
            value={data.total_investment}
            change={data.comparison.investment_delta_pct}
            changeLabel="vs last month"
            icon={<Briefcase className="h-5 w-5" />}
            variant="investment"
            className="h-full"
            formatter={formatCurrency}
          />
        </motion.div>
      </motion.div>

      {/* Charts Moved to Monthly Analytics Page */}

      {/* Insights Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Largest Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-display">Largest Transactions</h3>
              <p className="text-sm text-muted-foreground">Top 5 biggest spendings</p>
            </div>
          </div>
          <div className="space-y-4">
            {data.largest_transactions.length > 0 ? (
              data.largest_transactions.map((tx, i) => (
                <div key={tx.id_pk || i} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium truncate max-w-[150px]">{tx.notes || 'No description'}</div>
                      <div className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="font-semibold text-destructive">
                    {formatCurrency(Math.abs(Number(tx.amount)))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No transactions found</div>
            )}
          </div>
        </motion.div>

        {/* High Impact */}
        <div className="space-y-6">
          {/* Biggest Mover */}
          {data.biggest_mover && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold font-display">Biggest Mover</h3>
                <p className="text-sm text-muted-foreground">Largest spending change vs last month</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{data.biggest_mover.name}</div>
                  <div className="text-sm text-muted-foreground">Total: {formatCurrency(data.biggest_mover.total)}</div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Expenses (Compact) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold font-display">Top Expenses</h3>
              <p className="text-sm text-muted-foreground">Most expensive categories</p>
            </div>
            <div className="space-y-3">
              {data.top_expenses.map((category, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(category.total)} ({category.share_of_total}%)
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
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
