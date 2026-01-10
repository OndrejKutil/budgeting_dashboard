import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  variant?: 'default' | 'income' | 'expense' | 'savings' | 'investment';
  className?: string;
  formatter?: (value: number) => string;
}

const variantStyles = {
  default: 'border-border',
  income: 'border-success/30',
  expense: 'border-destructive/30',
  savings: 'border-info/30',
  investment: 'border-chart-investment/30',
};

const iconBgStyles = {
  default: 'bg-primary/10 text-primary',
  income: 'bg-success/10 text-success',
  expense: 'bg-destructive/10 text-destructive',
  savings: 'bg-info/10 text-info',
  investment: 'bg-chart-investment/10 text-chart-investment',
};

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  variant = 'default',
  className,
  formatter,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  const formattedValue = typeof value === 'number'
    ? (formatter ? formatter(value) : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }))
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border bg-card p-6 shadow-card transition-base hover:shadow-glow-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold font-display tracking-tight text-foreground">
            {formattedValue}
          </p>
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2.5', iconBgStyles[variant])}>
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isPositive && 'bg-success/10 text-success',
              isNegative && 'bg-destructive/10 text-destructive',
              isNeutral && 'bg-muted text-muted-foreground'
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {isNeutral && <Minus className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded skeleton-shimmer" />
          <div className="h-8 w-32 rounded skeleton-shimmer" />
        </div>
        <div className="h-10 w-10 rounded-lg skeleton-shimmer" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-5 w-16 rounded-full skeleton-shimmer" />
        <div className="h-4 w-24 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}
