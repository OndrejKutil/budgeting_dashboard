import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useUrlState } from '@/hooks/use-url-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmergencyFundPage() {
  const { formatCurrency } = useUser();
  const [selectedYear, setSelectedYear] = useUrlState('year', new Date().getFullYear().toString());
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 2);

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['emergency-fund', selectedYear],
    queryFn: async () => {
      const response = await analyticsApi.getEmergencyFund({ year: parseInt(selectedYear) });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to load emergency fund data');
    },
  });

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
        <p className="text-destructive">{error instanceof Error ? error.message : 'No data available'}</p>
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
            icon={<Info className="h-5 w-5" />}
            className="border-primary/10 bg-primary/5"
            formatter={formatCurrency}
          />
          <KPICard
            title="Annual Total"
            value={totalAnnual}
            icon={<Info className="h-5 w-5" />}
            className="border-primary/10 bg-primary/5"
            formatter={formatCurrency}
          />
          <KPICard
            title="3-Month Target"
            value={target3}
            icon={<Shield className="h-5 w-5" />}
            formatter={formatCurrency}
          />
          <KPICard
            title="6-Month Target"
            value={target6}
            icon={<Shield className="h-5 w-5" />}
            formatter={formatCurrency}
          />
        </div>

        {/* Progress Trackers */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 3 Months */}
          <div className={cn(
            'rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
            progress3 >= 100 ? 'border-primary/30 bg-primary/5' : 'border-border'
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-display text-foreground">3-Month Resilience</h3>
              {progress3 >= 100 ? (
                <Shield className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold font-display tracking-tight">
                    {formatCurrency(data.current_savings_amount)}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1"> / {formatCurrency(target3)}</span>
                </div>
                <span className={cn(
                  'text-lg font-medium',
                  progress3 >= 100 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {Math.min(progress3, 100).toFixed(0)}%
                </span>
              </div>
              <Progress
                value={Math.min(progress3, 100)}
                className={cn('h-2', progress3 >= 100 && '[&>div]:bg-primary')}
              />
              {progress3 < 100 && (
                <p className="mt-3 text-xs text-muted-foreground font-medium">
                  {formatCurrency(target3 - data.current_savings_amount)} to reach buffer
                </p>
              )}
            </div>
          </div>

          {/* 6 Months */}
          <div className={cn(
            'rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
            progress6 >= 100 ? 'border-primary/30 bg-primary/5' : 'border-border'
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-display text-foreground">6-Month Resilience</h3>
              {progress6 >= 100 ? (
                <Shield className="h-5 w-5 text-primary" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold font-display tracking-tight">
                    {formatCurrency(data.current_savings_amount)}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1"> / {formatCurrency(target6)}</span>
                </div>
                <span className={cn(
                  'text-lg font-medium',
                  progress6 >= 100 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {Math.min(progress6, 100).toFixed(0)}%
                </span>
              </div>
              <Progress
                value={Math.min(progress6, 100)}
                className={cn('h-2', progress6 >= 100 && '[&>div]:bg-primary')}
              />
              {progress6 < 100 && (
                <p className="mt-3 text-xs text-muted-foreground font-medium">
                  {formatCurrency(target6 - data.current_savings_amount)} to reach buffer
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
                    itemStyle={{ color: 'hsl(239, 84%, 67%)' }}
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="grid w-full sm:w-[400px] grid-cols-3">
            <TabsTrigger value="core">Core Only</TabsTrigger>
            <TabsTrigger value="necessary">Core + Necessary</TabsTrigger>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
          </TabsList>

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
        </div>
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
