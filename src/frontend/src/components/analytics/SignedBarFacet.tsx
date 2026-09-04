import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { CHART_COLORS } from '@/lib/chart-colors';

/** Matches the gutter the yearly page reserves for its own money axes. */
const MONEY_AXIS_WIDTH = 88;

export interface SignedBarPoint {
  month: string;
  value: number;
}

interface SignedBarFacetProps {
  title: string;
  total: string;
  data: SignedBarPoint[];
  /** Full-precision formatter for the tooltip. */
  formatCurrency: (value: number) => string;
  /** Short formatter for axis ticks. */
  formatCompact: (value: number) => string;
  onMonthClick?: (month: string) => void;
}

/**
 * One measure per panel, coloured by sign rather than by identity.
 *
 * Profit and cash flow are nested — cash flow is profit less what went into savings — so
 * profit is routinely several times larger. Two series on one plot would either imply
 * they are peers or need a second y-scale, so each gets its own panel.
 *
 * Each panel also gets its **own** y-scale. A shared one is the more principled default,
 * but here it flattens the smaller measure into an unreadable line at zero; the panel's
 * own labelled axis carries the magnitude instead, and the year total sits in its header
 * so the two are still directly comparable as numbers.
 *
 * With a single series per panel there is no identity to encode, which frees colour to
 * carry polarity instead: above the zero line reads as gain, below as loss.
 */
export function SignedBarFacet({
  title,
  total,
  data,
  formatCurrency,
  formatCompact,
  onMonthClick,
}: SignedBarFacetProps) {
  // Pad the axis so the tallest bar doesn't touch the top of the plot, and only extend
  // past zero when the data actually goes negative.
  const values = data.map((point) => point.value);
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  const pad = (rawMax - rawMin) * 0.08 || 1;
  const domain: [number, number] = [rawMin < 0 ? rawMin - pad : 0, rawMax > 0 ? rawMax + pad : 0];
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          <SensitiveValue>{total}</SensitiveValue>
        </span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
            onClick={(e) => e?.activeLabel && onMonthClick?.(e.activeLabel)}
            style={{ cursor: onMonthClick ? 'pointer' : undefined }}
          >
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              dy={6}
              interval={0}
            />
            <YAxis
              domain={domain}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={formatCompact}
              width={MONEY_AXIS_WIDTH}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number) => [
                <SensitiveValue key="value">{formatCurrency(value)}</SensitiveValue>,
                title,
              ]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
            <Bar dataKey="value" name={title} maxBarSize={22} radius={[4, 4, 0, 0]}>
              {data.map((point) => (
                <Cell
                  key={point.month}
                  fill={point.value >= 0 ? CHART_COLORS.income : CHART_COLORS.expense}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
