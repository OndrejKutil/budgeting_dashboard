import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { analyticsApi } from '@/lib/api/client';
import { EmergencyFundData } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmergencyFundPage() {
  const { formatCurrency } = useUser();
  const [data, setData] = useState<EmergencyFundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedYear = new Date().getFullYear(); // Default to current year for now

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await analyticsApi.getEmergencyFund({ year: selectedYear });
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.message || 'Failed to load emergency fund data');
        }
      } catch (err) {
        setError('An error occurred while fetching emergency fund data');
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

  const renderContent = (
    averageMonthly: number,
    target3: number,
    target6: number,
    totalAnnual: number,
    variant: 'core' | 'necessary' | 'all'
  ) => {
    const progress3 = (data.current_savings_amount / target3) * 100;
    const progress6 = (data.current_savings_amount / target6) * 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 mt-6"
      >
        {/* Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Monthly Average"
            value={averageMonthly}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="expense"
            formatter={formatCurrency}
          />
          <KPICard
            title="Annual Total"
            value={totalAnnual}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="expense"
            formatter={formatCurrency}
          />
          <KPICard
            title="3-Month Target"
            value={target3}
            icon={<Shield className="h-5 w-5" />}
            variant="savings"
            formatter={formatCurrency}
          />
          <KPICard
            title="6-Month Target"
            value={target6}
            icon={<Shield className="h-5 w-5" />}
            variant="investment"
            formatter={formatCurrency}
          />
        </div>

        {/* Progress Trackers */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 3 Months */}
          <div className={cn(
            'rounded-xl border bg-card p-6 shadow-card',
            progress3 >= 100 ? 'border-success/30' : 'border-border'
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-display">3-Month Emergency Fund</h3>
              {progress3 >= 100 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold font-display">
                    {formatCurrency(data.current_savings_amount)}
                  </span>
                  <span className="text-muted-foreground"> / {formatCurrency(target3)}</span>
                </div>
                <span className={cn(
                  'text-lg font-semibold',
                  progress3 >= 100 ? 'text-success' : 'text-foreground'
                )}>
                  {Math.min(progress3, 100).toFixed(0)}%
                </span>
              </div>
              <Progress
                value={Math.min(progress3, 100)}
                className={cn('mt-4 h-3', progress3 >= 100 && '[&>div]:bg-success')}
              />
              {progress3 < 100 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {formatCurrency(target3 - data.current_savings_amount)} more needed to reach this goal
                </p>
              )}
            </div>
          </div>

          {/* 6 Months */}
          <div className={cn(
            'rounded-xl border bg-card p-6 shadow-card',
            progress6 >= 100 ? 'border-success/30' : 'border-border'
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-display">6-Month Emergency Fund</h3>
              {progress6 >= 100 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold font-display">
                    {formatCurrency(data.current_savings_amount)}
                  </span>
                  <span className="text-muted-foreground"> / {formatCurrency(target6)}</span>
                </div>
                <span className={cn(
                  'text-lg font-semibold',
                  progress6 >= 100 ? 'text-success' : 'text-foreground'
                )}>
                  {Math.min(progress6, 100).toFixed(0)}%
                </span>
              </div>
              <Progress
                value={Math.min(progress6, 100)}
                className={cn('mt-4 h-3', progress6 >= 100 && '[&>div]:bg-success')}
              />
              {progress6 < 100 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {formatCurrency(target6 - data.current_savings_amount)} more needed to reach this goal
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Core Breakdown only shown for core tab */}
        {variant === 'core' && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 text-lg font-semibold font-display">Core Monthly Expenses Breakdown</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              These essential expenses make up your core survival budget.
            </p>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(data.core_category_breakdown)
                    .map(([name, amount]) => ({ name, amount }))
                    .sort((a, b) => b.amount - a.amount)}
                  layout="vertical"
                  barCategoryGap={12}
                  margin={{ left: 20 }}
                >
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 9%)',
                      border: '1px solid hsl(217, 19%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {Object.entries(data.core_category_breakdown).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(239, 84%, ${67 - (index % 5) * 6}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Fund Analysis"
        description="Track your emergency fund progress against different expense scenarios."
      />

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 text-sm text-muted-foreground">
        <Info className="h-5 w-5 text-primary shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">How it works</p>
          <p>
            The progress bar tracks savings funds that include <strong>"Emergency Fund"</strong> (case-insensitive) in their name (e.g. "My Emergency Fund 1").
            Create a fund with this name to start tracking.
          </p>
        </div>
      </div>

      <Tabs defaultValue="core" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="core">Core Only</TabsTrigger>
          <TabsTrigger value="necessary">Core + Necessary</TabsTrigger>
          <TabsTrigger value="all">All Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="core">
          {renderContent(
            data.average_monthly_core_expenses,
            data.three_month_core_target,
            data.six_month_core_target,
            data.total_core_expenses,
            'core'
          )}
        </TabsContent>
        <TabsContent value="necessary">
          {renderContent(
            data.average_monthly_core_necessary,
            data.three_month_core_necessary_target,
            data.six_month_core_necessary_target,
            data.total_core_necessary,
            'necessary'
          )}
        </TabsContent>
        <TabsContent value="all">
          {renderContent(
            data.average_monthly_all_expenses,
            data.three_month_all_target,
            data.six_month_all_target,
            data.total_all_expenses,
            'all'
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
