import { cn } from '@/lib/utils';

interface TraceProps {
  values: number[];
  width?: number;
  height?: number;
  /** Stroke colour comes from currentColor, set through this class. */
  className?: string;
}

/**
 * Small frameless trace of a balance. Hand-rolled SVG: at this size a chart library (and a
 * ResponsiveContainer per row) buys nothing. No history draws a faint dashed baseline, a
 * constant series a flat line in the middle.
 */
export function Trace({ values, width = 84, height = 26, className }: TraceProps) {
  // width/height are viewBox units (1 unit = 1/16 rem), so the trace scales with the root font size.
  const size = { width: `${width / 16}rem`, height: `${height / 16}rem` };
  const pad = 3;
  const mid = height / 2;

  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
    return (
      <svg style={size} viewBox={`0 0 ${width} ${height}`} className={cn('shrink-0 text-foreground/20', className)} aria-hidden="true" focusable="false">
        <line x1={0} x2={width} y1={mid} y2={mid} stroke="currentColor" strokeWidth={1.5} strokeDasharray="2 4" strokeLinecap="round" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = range === 0 ? mid : height - pad - ((value - min) / range) * (height - pad * 2);
      return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg style={size} viewBox={`0 0 ${width} ${height}`} className={cn('shrink-0 text-foreground/45', className)} aria-hidden="true" focusable="false">
      <path d={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
