import { ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUser } from '@/contexts/user-context';
import type { InvestmentContribution } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { isZeroAmount, NET_WORTH_RANGES, type NetWorthRange } from './helpers';
import { Trace } from './Trace';

interface NetWorthSummaryProps {
  range: NetWorthRange;
  onRangeChange: (range: NetWorthRange) => void;
  loading: boolean;
  values: number[];
  investments: InvestmentContribution | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  /** Set only while the chart is rendered. */
  chartId?: string;
  className?: string;
}

/**
 * Net worth as a secondary element of the page header: small label with the range options,
 * a medium figure with its change over the range, a small trace (which opens the chart) and
 * the quiet "invested" note. The headline stays liquid-only by design; the invested note is
 * informational and never folded into the figure.
 */
export function NetWorthSummary({
  range,
  onRangeChange,
  loading,
  values,
  investments,
  expanded,
  onToggle,
  chartId,
  className,
}: NetWorthSummaryProps) {
  const { t, formatCurrency } = useUser();
  const hasData = values.length > 0;
  const current = hasData ? values[values.length - 1] : 0;
  const change = values.length > 1 ? current - values[0] : null;
  const period = t(`pages.netWorth.period${range}` as 'pages.netWorth.period30d');

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[0.8125rem] text-muted-foreground">{t('pages.netWorth.title')}</span>
        <div role="group" aria-label={t('pages.netWorth.rangeLabel')} className="flex gap-3.5 text-[0.8125rem]">
          {NET_WORTH_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRangeChange(r)}
              className={cn(
                'border-b-2 pb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                range === r
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`pages.netWorth.range${r.charAt(0).toUpperCase() + r.slice(1)}` as 'pages.netWorth.range30d')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-2 h-[1.625rem] w-64 max-w-full" />
      ) : !hasData ? (
        <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{t('pages.netWorth.noData')}</p>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={chartId}
          className="mt-1 flex max-w-full items-center gap-3.5 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="sr-only">{t(expanded ? 'pages.netWorth.hideChart' : 'pages.netWorth.showChart')}</span>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="whitespace-nowrap text-[1.1875rem] tracking-[-0.02em] tabular-nums">
              <SensitiveValue>{formatCurrency(current)}</SensitiveValue>
            </span>
            {change !== null && (
              <small
                className={cn(
                  'whitespace-nowrap text-[0.8125rem] tabular-nums',
                  isZeroAmount(change) ? 'text-muted-foreground' : change > 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {isZeroAmount(change) ? (
                  t('pages.netWorth.noChange')
                ) : (
                  <SensitiveValue>
                    {t('pages.netWorth.changeIn', {
                      amount: `${change > 0 ? '+' : ''}${formatCurrency(change)}`,
                      period,
                    })}
                  </SensitiveValue>
                )}
              </small>
            )}
          </span>
          <Trace values={values} />
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      )}

      {investments && !loading && hasData && (
        <p
          className={cn(
            'mt-0.5 text-[0.8125rem]',
            investments.is_stale ? 'text-muted-foreground' : 'text-success',
          )}
        >
          <SensitiveValue>
            {t('pages.netWorth.investedChip', { amount: formatCurrency(investments.total_value) })}
          </SensitiveValue>
          {investments.is_stale && ` (${t('pages.netWorth.investedStale')})`}
        </p>
      )}
    </div>
  );
}
