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
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { summaryApi, analyticsApi } from '@/lib/api/client';
import type { SummaryData, YearlyAnalyticsData } from '@/lib/api/types';
import { useUser } from '@/contexts/user-context';

// Constants for charts - Teal-based palette
const COLORS = [
  'hsl(185, 70%, 45%)',   // Primary teal
  'hsl(175, 70%, 42%)',   // Secondary teal
  'hsl(38, 80%, 55%)',    // Accent gold
  'hsl(142, 71%, 45%)',   // Success green
  'hsl(195, 20%, 60%)',   // Muted
  'hsl(0, 84%, 60%)',     // Destructive red
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
  const [yearlyData, setYearlyData] = useState<YearlyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleString('default', { month: 'short' });

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

  // Secondary fetch for sparkline data
  useEffect(() => {
    const fetchYearly = async () => {
      try {
        const response = await analyticsApi.getYearly({ year: new Date().getFullYear() });
        if (response.success && response.data) {
          setYearlyData(response.data);
        }
      } catch (err) {
        // Sparklines are non-critical, silently ignore
      }
    };
    fetchYearly();
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
    <div className="space-y-8 max-w-[1600px] mx-auto">
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
            <Button size="sm" asChild>
              <Link to="/dashboard/analytics/monthly">
                <BarChart3 className="mr-2 h-4 w-4" />
                Full Analytics
              </Link>
            </Button>
          </div>
        }
      />

      {/* Primary KPI Section (Hero) */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* HERO CARD: Net Cash Flow */}
        <div className="col-span-2 row-span-1 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Net Cash Flow</h3>
              <div className="flex items-baseline gap-4">
                <span className={`text-3xl sm:text-5xl font-bold font-display tracking-tight ${data.net_cash_flow >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatCurrency(data.net_cash_flow)}
                </span>
                <span className="text-sm font-medium text-muted-foreground/60 flex items-center gap-1">
                  {data.comparison.cashflow_delta_pct >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.cashflow_delta_pct).toFixed(1)}%
                  <span className="text-xs text-muted-foreground/40 ml-1">vs. {prevMonthName}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground/60">
                {data.net_cash_flow >= 0 ? "Positive cash flow. You are building alignment." : "Negative cash flow. Outflows exceed inflows."}
              </p>
            </div>
          </div>
        </div>

        {/* SECONDARY CARD: Net Profit */}
        {/* SECONDARY CARD: Net Profit */}
        <div className="col-span-2 row-span-1 rounded-2xl border border-border/50 bg-card/50 p-8 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Net Profit</h3>
              <div className="flex items-baseline gap-4">
                <span className={`text-3xl sm:text-5xl font-bold font-display tracking-tight ${data.profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatCurrency(data.profit)}
                </span>
                <span className="text-sm font-medium text-muted-foreground/60 flex items-center gap-1">
                  {data.comparison.profit_delta_pct >= 0 ? '↑' : '↓'} {Math.abs(data.comparison.profit_delta_pct).toFixed(1)}%
                  <span className="text-xs text-muted-foreground/40 ml-1">vs. {prevMonthName}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground/60">
                {data.profit >= 0 ? "You're net positive this month." : "Expenses exceeding income."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tertiary Metrics (Collapsed/Muted) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Income",
            value: data.total_income,
            icon: TrendingUp,
            delta: data.comparison.income_delta_pct,
            sparkData: yearlyData?.monthly_income.slice(0, new Date().getMonth() + 1),
            color: 'text-emerald-500'
          },
          {
            label: "Total Expenses",
            value: data.total_expense,
            icon: TrendingDown,
            delta: data.comparison.expense_delta_pct,
            sparkData: yearlyData?.monthly_expense.slice(0, new Date().getMonth() + 1),
            color: 'text-rose-500',
            invert: true
          },
          {
            label: "Savings",
            value: data.total_saving,
            icon: PiggyBank,
            delta: data.comparison.saving_delta_pct,
            sparkData: yearlyData?.monthly_saving.slice(0, new Date().getMonth() + 1),
            extra: `${(data.savings_rate * 100).toFixed(1)}% Rate`,
            color: 'text-emerald-500'
          },
          {
            label: "Investments",
            value: data.total_investment,
            icon: Briefcase,
            delta: data.comparison.investment_delta_pct,
            sparkData: yearlyData?.monthly_investment.slice(0, new Date().getMonth() + 1),
            extra: `${(data.investment_rate * 100).toFixed(1)}% Rate`,
            color: 'text-primary'
          },
        ].map((metric, i) => {
          const isPositive = metric.invert ? metric.delta <= 0 : metric.delta >= 0;
          return (
            <div key={i} className="flex flex-col justify-between p-4 rounded-xl border border-border/30 bg-card/30 hover:bg-card/50 transition-colors min-h-[110px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-background-secondary text-muted-foreground">
                      <metric.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{metric.label}</span>
                  </div>
                  {metric.extra && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-background/50 border border-border/50 ${metric.color}`}>
                      {metric.extra}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-semibold font-display tracking-tight">{formatCurrency(metric.value)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs ${isPositive ? 'text-success/70' : 'text-destructive/70'} font-medium flex items-center gap-1`}>
                  {metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(1)}% <span className="text-muted-foreground/40 font-normal">vs. {prevMonthName}</span>
                </span>

                {metric.sparkData && metric.sparkData.length > 0 && (
                  <div className="h-8 w-20 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metric.sparkData.map((v, idx) => ({ v: v, idx }))}>
                        <defs>
                          <linearGradient id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'}
                          strokeWidth={1.5}
                          fill={`url(#gradient-${i})`}
                          fillOpacity={1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Featured Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Largest Transactions - Revised */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-0 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-display">Largest Transactions</h3>
              <p className="text-sm text-muted-foreground">Where the money went</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/dashboard/transactions">View All</Link>
            </Button>
          </div>
          <div className="p-0">
            {data.largest_transactions.length > 0 ? (
              <div className="divide-y divide-border/30">
                {data.largest_transactions.map((tx, i) => (
                  <div key={tx.id_pk || i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground">
                        {i + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{tx.notes || 'Uncategorized'}</span>
                        <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="font-mono font-medium text-foreground">
                      {formatCurrency(Math.abs(Number(tx.amount)))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">No transactions found</div>
            )}
          </div>
        </motion.div>

        {/* Insight Columns */}
        <div className="space-y-6">
          {/* Biggest Mover - Redesigned */}
          {data.biggest_mover && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-mono text-primary uppercase tracking-wider mb-1">Spotlight</div>
                  <h3 className="text-lg font-bold font-display text-foreground">{data.biggest_mover.name}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{formatCurrency(data.biggest_mover.total)}</span>
                  <span className="text-xs text-muted-foreground">total spend</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Share of Wallet</span>
                    <span className="font-medium">{(data.biggest_mover.share_of_total || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min((data.biggest_mover.share_of_total || 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Expenses List Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-widest">Category Top 3</h3>
            <div className="space-y-4">
              {data.top_expenses.slice(0, 3).map((category, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                    <span className="text-sm font-medium group-hover:text-foreground transition-colors">{category.name}</span>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                    {formatCurrency(category.total)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
