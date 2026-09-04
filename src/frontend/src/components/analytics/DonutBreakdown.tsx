import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutBreakdownProps {
  data: DonutSlice[];
  formatCurrency: (value: number) => string;
  /** Caption under the centred total, e.g. "Total". */
  centerLabel: string;
}

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: DonutSlice & { share: number } }>;
  formatCurrency: (value: number) => string;
}

const DonutTooltip = ({ active, payload, formatCurrency }: DonutTooltipProps) => {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-0.5 text-xs text-muted-foreground">{slice.name}</p>
      <p className="text-sm font-bold" style={{ color: slice.color }}>
        <SensitiveValue>{formatCurrency(slice.value)}</SensitiveValue>
        <span className="ml-1.5 font-medium text-muted-foreground">
          <SensitiveValue>{slice.share.toFixed(1)}%</SensitiveValue>
        </span>
      </p>
    </div>
  );
};

/**
 * Donut + legend for breakdowns with only a handful of slices, where a bar chart wastes
 * the width and hides the part-of-whole relationship. The legend carries the exact figures
 * so the chart itself never has to be read for precision.
 */
export function DonutBreakdown({ data, formatCurrency, centerLabel }: DonutBreakdownProps) {
  const { slices, total } = useMemo(() => {
    const sum = data.reduce((acc, slice) => acc + slice.value, 0);
    return {
      slices: data
        .filter((slice) => slice.value !== 0)
        .map((slice) => ({ ...slice, share: sum > 0 ? (slice.value / sum) * 100 : 0 })),
      total: sum,
    };
  }, [data]);

  return (
    <div className="flex h-full flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative h-[200px] w-full shrink-0 sm:h-full sm:w-[55%]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip formatCurrency={formatCurrency} />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {centerLabel}
          </span>
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">
            <SensitiveValue>{formatCurrency(total)}</SensitiveValue>
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2.5 sm:w-[45%]">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{slice.name}</span>
            <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
              <SensitiveValue>{formatCurrency(slice.value)}</SensitiveValue>
            </span>
            <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted-foreground/70">
              <SensitiveValue>{slice.share.toFixed(0)}%</SensitiveValue>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
