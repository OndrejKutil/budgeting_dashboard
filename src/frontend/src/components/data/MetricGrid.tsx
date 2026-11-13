import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { FigureParts } from '@/components/data/BigFigure';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';

export type MetricDirection = 'higherIsBetter' | 'lowerIsBetter';

export interface MetricComparison {
  /** The six-month average of this figure; null or undefined when there is no history. */
  average: number | null | undefined;
  direction: MetricDirection;
  /**
   * `percent` for figures that are always positive (income, expenses, saved, invested);
   * `amount` for figures that sit near zero or go negative (profit, cash flow), where a
   * percentage would be meaningless.
   */
  unit: 'percent' | 'amount';
}

export interface Metric {
  key: string;
  label: string;
  value: number;
  /** The amount as Intl parts (`formatMoneyParts`). */
  parts: Intl.NumberFormatPart[];
  /** Short muted note beside the label, e.g. "16 % of income". Hidden with amounts. */
  sub?: string;
  /** `accent` = amber (at most one per view). Negative values are red regardless. */
  accent?: boolean;
  /** A change rather than a level: shown with "+" and green when positive. */
  signed?: boolean;
  comparison?: MetricComparison;
  /** Free line under the amount, used instead of `comparison` (caller handles colour and privacy). */
  note?: ReactNode;
  /** Shows a placeholder instead of the amount. */
  loading?: boolean;
}

interface MetricGridProps {
  metrics: Metric[];
  /** Grid column classes, e.g. "grid-cols-2 xl:grid-cols-6". */
  className?: string;
  size?: 'md' | 'lg';
  /** Formats an absolute amount difference (for `amount` comparisons). */
  formatAmount: (value: number) => string;
}

/** Percent differences under this, or amount differences under half a unit, read as "in line". */
const NEGLIGIBLE_PERCENT = 0.5;

const FIGURE_SIZE = {
  md: 'text-[1.375rem] sm:text-[1.5rem] lg:text-[1.625rem]',
  lg: 'text-[2rem] sm:text-[2.5rem] lg:text-[2.75rem]',
} as const;

/**
 * Labelled figures in a grid: label over a hairline, the amount, an optional muted sub line
 * and the difference from the six-month average (green when favourable, red when not).
 */
export function MetricGrid({ metrics, className, size = 'md', formatAmount }: MetricGridProps) {
  const { t, formatNumber } = useUser();

  const comparisonLine = (value: number, comparison: MetricComparison | undefined) => {
    const { average } = comparison ?? {};
    // Keeps rows aligned when one figure has no history.
    const empty = <p className="mt-1 min-h-[1.25rem]" aria-hidden="true" />;
    if (!comparison || average === null || average === undefined) return empty;

    let difference: number;
    let change: string;
    if (comparison.unit === 'percent') {
      if (Math.abs(average) < 0.005) return empty;
      difference = ((value - average) / Math.abs(average)) * 100;
      if (Math.abs(difference) < NEGLIGIBLE_PERCENT) difference = 0;
      change = formatNumber(difference / 100, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 });
    } else {
      difference = Math.abs(value - average) < 0.5 ? 0 : value - average;
      change = `${difference > 0 ? '+' : '−'}${formatAmount(Math.abs(difference))}`;
    }

    const favourable = comparison.direction === 'higherIsBetter' ? difference > 0 : difference < 0;
    return (
      <p
        className={cn(
          'mt-1 text-[0.8125rem]',
          difference === 0 ? 'text-muted-foreground' : favourable ? 'text-success' : 'text-destructive',
        )}
      >
        <SensitiveValue>
          {difference === 0 ? t('metrics.inLineWithAverage') : t('metrics.vsAverage', { change })}
        </SensitiveValue>
      </p>
    );
  };

  return (
    <div className={cn('grid gap-x-8 gap-y-6', className)}>
      {metrics.map((metric) => (
        <div key={metric.key} className="min-w-0 border-t border-border pt-3">
          {/* The sub line shares the label's row so figures and comparisons stay aligned across a row. */}
          <div className="flex items-baseline justify-between gap-3 text-[0.8125rem] text-muted-foreground">
            <span className="min-w-0 truncate">{metric.label}</span>
            {metric.sub && (
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                <SensitiveValue>{metric.sub}</SensitiveValue>
              </span>
            )}
          </div>
          {metric.loading ? (
            <Skeleton className={cn('mt-1.5 w-2/3', size === 'lg' ? 'h-[2.5rem]' : 'h-[1.75rem]')} />
          ) : (
            <div
              className={cn(
                'mt-1 whitespace-nowrap font-light tabular-nums',
                FIGURE_SIZE[size],
                // After the size classes: tailwind-merge drops a leading class that precedes a text-size one.
                'leading-[1.15] tracking-[-0.03em]',
                metric.value < 0
                  ? 'text-destructive'
                  : metric.signed && metric.value > 0
                    ? 'text-success'
                    : metric.accent
                      ? 'text-primary'
                      : 'text-foreground',
              )}
            >
              <SensitiveValue>
                {metric.signed && metric.value > 0 && '+'}
                <FigureParts parts={metric.parts} currencyScale="0.55em" />
              </SensitiveValue>
            </div>
          )}
          {metric.note !== undefined ? (
            <p className="mt-1 min-h-[1.25rem] text-[0.8125rem] text-muted-foreground">{metric.note}</p>
          ) : (
            comparisonLine(metric.value, metric.comparison)
          )}
        </div>
      ))}
    </div>
  );
}
