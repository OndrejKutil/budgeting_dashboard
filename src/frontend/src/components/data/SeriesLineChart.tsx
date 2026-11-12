import { useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';

interface SeriesLineChartProps {
  /** Number of x positions (for a month: its number of days). */
  length: number;
  /** Solid amber series; may be shorter than `length` (a month in progress). */
  primary: number[];
  /** Dashed grey comparison series; empty when there is no history. */
  comparison: number[];
  formatAxis: (value: number) => string;
  formatValue: (value: number) => string;
  /** Label for an x position (0-based index). */
  xLabel: (index: number) => string;
  tooltipTitle: (index: number) => string;
  primaryName: string;
  comparisonName: string;
  /** Accessible name; the caller leaves amounts out of it in privacy mode. */
  ariaLabel: string;
  height?: number;
}

const MARGIN = { left: 46, right: 14, top: 10, bottom: 26 };

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Frameless line chart for two cumulative series: faint gridlines, small axis labels, a solid
 * amber line with a labelled end point, a dashed grey comparison line. Drawn as plain SVG at
 * the measured width so text stays the same size at every screen width.
 */
export function SeriesLineChart({
  length,
  primary,
  comparison,
  formatAxis,
  formatValue,
  xLabel,
  tooltipTitle,
  primaryName,
  comparisonName,
  ariaLabel,
  height = 190,
}: SeriesLineChartProps) {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>();
  const { isPrivacyMode } = usePrivacyMode();
  const [hover, setHover] = useState<number | null>(null);
  const blur = isPrivacyMode ? { filter: 'blur(5px)' } : undefined;

  const max = Math.max(1, ...primary, ...comparison);
  const step = niceStep(max / 3);
  const tickCount = Math.ceil(max / step);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * step);
  const top = ticks[ticks.length - 1];

  const innerWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const lastIndex = Math.max(1, length - 1);
  const x = (index: number) => MARGIN.left + (index / lastIndex) * innerWidth;
  const y = (value: number) => MARGIN.top + innerHeight - (value / top) * innerHeight;
  const path = (series: number[]) =>
    series.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');

  const xTicks = [...new Set([0, 9, 19, length - 1].filter((index) => index >= 0 && index < length))];

  const endIndex = primary.length - 1;
  const endValue = endIndex >= 0 ? primary[endIndex] : 0;
  const compareAtEnd = comparison[endIndex];
  const primaryAbove = compareAtEnd !== undefined && compareAtEnd < endValue;
  const comparisonEndIndex = comparison.length - 1;
  const sameX = comparisonEndIndex === endIndex;
  const endLabelAnchor = x(endIndex) - MARGIN.left < 60 ? 'start' : 'end';

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.min(length - 1, Math.max(0, Math.round(ratio * lastIndex))));
  };

  const hoverPrimary = hover !== null ? primary[hover] : undefined;
  const hoverComparison = hover !== null ? comparison[hover] : undefined;

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-foreground/10"
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground/70 text-[11px]"
                style={blur}
              >
                {tick === 0 ? '0' : formatAxis(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((index) => (
            <text
              key={index}
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground/70 text-[11px]"
            >
              {xLabel(index)}
            </text>
          ))}

          {comparison.length > 0 && (
            <path
              d={path(comparison)}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 5"
              className="stroke-muted-foreground/60"
            />
          )}
          {primary.length > 0 && (
            <path d={path(primary)} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-primary" />
          )}

          {comparison.length > 0 && (
            <text
              x={x(comparisonEndIndex) - 10}
              y={y(comparison[comparisonEndIndex]) + (sameX && primaryAbove ? 20 : -10)}
              textAnchor="end"
              className="fill-muted-foreground/70 text-[11px]"
              style={blur}
            >
              {formatValue(comparison[comparisonEndIndex])}
            </text>
          )}
          {primary.length > 0 && (
            <>
              <circle cx={x(endIndex)} cy={y(endValue)} r={4.5} className="fill-primary" />
              <text
                x={endLabelAnchor === 'end' ? x(endIndex) - 10 : x(endIndex) + 10}
                y={y(endValue) + (primaryAbove ? -10 : 20)}
                textAnchor={endLabelAnchor}
                className="fill-foreground text-[12.5px]"
                style={blur}
              >
                {formatValue(endValue)}
              </text>
            </>
          )}

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={MARGIN.top + innerHeight} className="stroke-foreground/25" />
              {hoverPrimary !== undefined && <circle cx={x(hover)} cy={y(hoverPrimary)} r={3.5} className="fill-primary" />}
              {hoverComparison !== undefined && (
                <circle cx={x(hover)} cy={y(hoverComparison)} r={3} className="fill-muted-foreground" />
              )}
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
          className="glass glass-dense pointer-events-none absolute top-0 z-10 min-w-[8.5rem] rounded-xl px-3 py-2 text-xs"
          style={{
            left: Math.min(Math.max(x(hover) + 12, 0), Math.max(0, width - 150)),
          }}
        >
          <div className="mb-1 text-muted-foreground">{tooltipTitle(hover)}</div>
          {hoverPrimary !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{primaryName}</span>
              <span className="tabular-nums text-foreground">
                <SensitiveValue>{formatValue(hoverPrimary)}</SensitiveValue>
              </span>
            </div>
          )}
          {hoverComparison !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{comparisonName}</span>
              <span className="tabular-nums text-foreground">
                <SensitiveValue>{formatValue(hoverComparison)}</SensitiveValue>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
