import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { KPICard } from '@/components/ui/kpi-card';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
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

const coreExpenses = [
  { name: 'Housing', amount: 1800 },
  { name: 'Food', amount: 450 },
  { name: 'Utilities', amount: 200 },
  { name: 'Transport', amount: 280 },
  { name: 'Insurance', amount: 150 },
];

const totalCore = coreExpenses.reduce((sum, e) => sum + e.amount, 0);
const target3Month = totalCore * 3;
const target6Month = totalCore * 6;
const currentSaved = 8500;

export default function EmergencyFundPage() {
  const { formatCurrency } = useUser();
  const progress3 = (currentSaved / target3Month) * 100;
  const progress6 = (currentSaved / target6Month) * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Fund Analysis"
        description="Track your emergency fund progress and targets"
      />

      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <KPICard
          title="Monthly Core Expenses"
          value={totalCore}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="expense"
          formatter={formatCurrency}
        />
        <KPICard
          title="3-Month Target"
          value={target3Month}
          icon={<Shield className="h-5 w-5" />}
          variant="savings"
          formatter={formatCurrency}
        />
        <KPICard
          title="6-Month Target"
          value={target6Month}
          icon={<Shield className="h-5 w-5" />}
          variant="investment"
          formatter={formatCurrency}
        />
      </motion.div>

      {/* Progress Trackers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'rounded-xl border bg-card p-6 shadow-card',
            progress3 >= 100 ? 'border-success/30' : 'border-border'
          )}
        >
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
                  {formatCurrency(currentSaved)}
                </span>
                <span className="text-muted-foreground"> / {formatCurrency(target3Month)}</span>
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
                {formatCurrency(target3Month - currentSaved)} more needed to reach this goal
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'rounded-xl border bg-card p-6 shadow-card',
            progress6 >= 100 ? 'border-success/30' : 'border-border'
          )}
        >
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
                  {formatCurrency(currentSaved)}
                </span>
                <span className="text-muted-foreground"> / {formatCurrency(target6Month)}</span>
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
                {formatCurrency(target6Month - currentSaved)} more needed to reach this goal
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Core Expenses Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <h3 className="mb-4 text-lg font-semibold font-display">Core Monthly Expenses</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          These essential expenses are used to calculate your emergency fund targets.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coreExpenses} layout="vertical" barCategoryGap={12}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 14%, 64%)', fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(217, 19%, 20%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                {coreExpenses.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(239, 84%, ${67 - index * 6}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
