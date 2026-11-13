import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';

interface ValueLineChartProps {
  dates: string[];
  values: number[];
  locale: string;
  formatAxis: (value: number) => string;
  formatValue: (value: number) => string;
  name: string;
  /** Accessible name; the caller leaves amounts out of it in privacy mode. */
  ariaLabel: string;
  height?: number;
}

// Margins and height are in rem so the chart follows the fluid root font size.
const MARGIN_REM = { left: 3.25, right: 1, top: 0.75, bottom: 1.625 };

const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Plain dates are read at local noon (no timezone shift); full timestamps as they are. */
const parseDate = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00` : value);

/**
 * Frameless value-over-time line (net worth, portfolio value): faint gridlines, one amber series with a labelled end point, no
 * fill. Unlike SeriesLineChart (cumulative series from zero) the value axis fits the data,
 * so a net worth in the hundreds of thousands, or one below zero, still reads. Plain SVG at
 * the measured width so text stays one size at every screen width.
 */
export function ValueLineChart({
  dates,
  values,
  locale,
  formatAxis,
  formatValue,
  name,
  ariaLabel,
  height: heightRem = 13.125,
}: ValueLineChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rem, setRem] = useState(16);
  const { isPrivacyMode } = usePrivacyMode();
  const [hover, setHover] = useState<number | null>(null);
  const blur = isPrivacyMode ? { filter: 'blur(5px)' } : undefined;

  useLayoutEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const measure = () => {
      setWidth(element.clientWidth);
      setRem(rootFontSize());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = heightRem * rem;
  const MARGIN = {
    left: MARGIN_REM.left * rem,
    right: MARGIN_REM.right * rem,
    top: MARGIN_REM.top * rem,
    bottom: MARGIN_REM.bottom * rem,
  };
  const count = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = niceStep((max - min || Math.abs(max) || 1) / 3);
  const bottom = Math.floor(min / step) * step;
  const top = Math.max(Math.ceil(max / step) * step, bottom + step);
  const ticks: number[] = [];
  for (let tick = bottom; tick <= top + step / 2; tick += step) ticks.push(tick);

  const innerWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const lastIndex = Math.max(1, count - 1);
  const x = (index: number) => MARGIN.left + (index / lastIndex) * innerWidth;
  const y = (value: number) => MARGIN.top + innerHeight - ((value - bottom) / (top - bottom)) * innerHeight;
  const path = values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');

  const xTickCount = width < 32.5 * rem ? 3 : 5;
  const xTicks = [...new Set(Array.from({ length: xTickCount }, (_, i) => Math.round((i * (count - 1)) / (xTickCount - 1))))];
  // Label format follows the actual span, and consecutive identical labels collapse.
  const spanDays = count > 1 ? (parseDate(dates[count - 1]).getTime() - parseDate(dates[0]).getTime()) / 86_400_000 : 0;
  const xLabel = (index: number) =>
    parseDate(dates[index]).toLocaleDateString(
      locale,
      spanDays > 150 ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' },
    );
  const labelledTicks = xTicks.filter((index, i) => i === 0 || xLabel(index) !== xLabel(xTicks[i - 1]));

  const endIndex = count - 1;
  const endValue = values[endIndex];
  const endNearLeft = x(endIndex) - MARGIN.left < 3.75 * rem;

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.min(count - 1, Math.max(0, Math.round(ratio * lastIndex))));
  };

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ height: `${heightRem}rem` }}>
      {width > 0 && count > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className="stroke-foreground/10" />
              <text
                x={MARGIN.left - 0.5 * rem}
                y={y(tick) + 0.25 * rem}
                textAnchor="end"
                className="fill-muted-foreground/70 text-[0.6875rem]"
                style={blur}
              >
                {tick === 0 ? '0' : formatAxis(tick)}
              </text>
            </g>
          ))}
          {labelledTicks.map((index) => (
            <text
              key={index}
              x={x(index)}
              y={height - 0.5 * rem}
              textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground/70 text-[0.6875rem]"
            >
              {xLabel(index)}
            </text>
          ))}

          <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-primary" />
          <circle cx={x(endIndex)} cy={y(endValue)} r={0.28125 * rem} className="fill-primary" />
          <text
            x={endNearLeft ? x(endIndex) + 0.625 * rem : x(endIndex) - 0.625 * rem}
            y={Math.max(MARGIN.top + 0.625 * rem, y(endValue) - 0.625 * rem)}
            textAnchor={endNearLeft ? 'start' : 'end'}
            className="fill-foreground text-[0.78125rem]"
            style={blur}
          >
            {formatValue(endValue)}
          </text>

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={MARGIN.top + innerHeight} className="stroke-foreground/25" />
              <circle cx={x(hover)} cy={y(values[hover])} r={0.21875 * rem} className="fill-primary" />
            </g>
          )}
          <rect
            x={MARGIN.left}
            y={0}
            width={innerWidth}
            height={height - MARGIN.bottom}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover !== null && width > 0 && (
        <div
          className="glass glass-dense pointer-events-none absolute top-0 z-10 min-w-[8.5rem] rounded-xl px-3 py-2 text-[0.75rem]"
          style={{ left: Math.min(Math.max(x(hover) + 0.75 * rem, 0), Math.max(0, width - 10 * rem)) }}
        >
          <div className="mb-1 text-muted-foreground">
            {parseDate(dates[hover]).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{name}</span>
            <span className="tabular-nums text-foreground">
              <SensitiveValue>{formatValue(values[hover])}</SensitiveValue>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
