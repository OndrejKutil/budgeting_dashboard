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
  invert?: boolean;
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
  invert = false,
}: KPICardProps) {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;
  const isNeutral = change === 0;

  // Determine if the change is "good" or "bad" based on invert prop
  // Default: Increase is good (Green), Decrease is bad (Red)
  // Invert: Increase is bad (Red), Decrease is good (Green)
  const isGood = change !== undefined && (invert ? change < 0 : change > 0);
  const isBad = change !== undefined && (invert ? change > 0 : change < 0);

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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold font-display tracking-tight text-foreground truncate">
            {formattedValue}
          </p>
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2.5 flex items-center justify-center shrink-0', iconBgStyles[variant])}>
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={cn(
            'font-medium',
            isGood && 'text-success/70',
            isBad && 'text-destructive/70',
            isNeutral && 'text-muted-foreground/60'
          )}>
            {isPositiveChange ? '↑' : isNegativeChange ? '↓' : '–'} {Math.abs(change).toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-muted-foreground/40">{changeLabel}</span>
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
