import { useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';

interface DayBarsProps {
  /** One value per day that has happened, day 1 first. Days after the last value are drawn empty. */
  values: number[];
  /** Number of day slots (the month's length). */
  length: number;
  /** Horizontal dashed reference line (null for none). */
  average: number | null;
  /** Short label drawn at the right end of the reference line, e.g. "avg 1,240 Kč". Blurred in privacy mode. */
  averageLabel: string;
  formatValue: (value: number) => string;
  /** Compact y-axis tick label, e.g. "2k". Blurred in privacy mode. */
  formatAxis: (value: number) => string;
  /** Long date used as the tooltip title and in the bar's accessible name. */
  dayTitle: (index: number) => string;
  /** Accessible name of the whole chart. Leave amounts out in privacy mode. */
  ariaLabel: string;
  /** Hint read by screen readers for the arrow-key navigation. */
  keyboardHint: string;
  /** Height in rem. */
  height?: number;
}

/** Margins in rem; the SVG is drawn in pixels, so they are converted with the current root font size. */
const MARGIN_REM = { top: 0.625, bottom: 1.5 };
/** Axis labels are 0.6875rem, the line label 0.75rem; tabular digits are about 0.6em wide. */
const AXIS_FONT_REM = 0.6875;
const LINE_FONT_REM = 0.75;
const CHAR_EM = 0.6;
const LABEL_GAP_REM = 0.5;

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

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
 * Frameless strip of one thin bar per day on a y-axis with faint gridlines. Bars above the
 * reference value are slightly brighter; the reference is a dashed amber line with its value
 * written at the line's right end. Each elapsed day is a focusable column (roving tabindex,
 * arrow keys) that shows its date and amount in a tooltip. Plain SVG at the measured width so
 * text keeps its size at every screen width.
 */
export function DayBars({
  values,
  length,
  average,
  averageLabel,
  formatValue,
  formatAxis,
  dayTitle,
  ariaLabel,
  keyboardHint,
  height: heightRem = 11,
}: DayBarsProps) {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>();
  const { isPrivacyMode } = usePrivacyMode();
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const columnRefs = useRef<(SVGRectElement | null)[]>([]);

  // Re-read on every render: a width change (which re-renders) is what accompanies a root size change.
  const rem = rootFontSize();
  const blur = isPrivacyMode ? { filter: `blur(${0.3125 * rem}px)` } : undefined;

  const peak = Math.max(1, ...values, average ?? 0);
  const step = niceStep(peak / 3);
  const ticks = Array.from({ length: Math.ceil(peak / step) + 1 }, (_, i) => i * step);
  const top = ticks[ticks.length - 1];
  const tickLabel = (tick: number) => (tick === 0 ? '0' : formatAxis(tick));

  // Room for the widest tick label on the left and the average label on the right.
  const longestTick = Math.max(...ticks.map((tick) => tickLabel(tick).length));
  const MARGIN = {
    left: (longestTick * AXIS_FONT_REM * CHAR_EM + LABEL_GAP_REM) * rem,
    right: average !== null ? (averageLabel.length * LINE_FONT_REM * CHAR_EM + LABEL_GAP_REM) * rem : 0.125 * rem,
    top: MARGIN_REM.top * rem,
    bottom: MARGIN_REM.bottom * rem,
  };
  const height = heightRem * rem;
  const innerWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const slot = innerWidth / Math.max(1, length);
  const barWidth = Math.max(0.125 * rem, Math.min(slot * 0.6, 0.875 * rem));
  const baseline = MARGIN.top + innerHeight;
  const plotRight = MARGIN.left + innerWidth;
  const y = (value: number) => baseline - (value / top) * innerHeight;
  const slotLeft = (index: number) => MARGIN.left + index * slot;
  const center = (index: number) => slotLeft(index) + slot / 2;

  const xTicks = [...new Set([0, ...Array.from({ length: Math.floor(length / 5) }, (_, i) => (i + 1) * 5 - 1)])].filter(
    (index) => index < length,
  );

  const moveFocus = (next: number) => {
    const bounded = Math.min(values.length - 1, Math.max(0, next));
    setFocusIndex(bounded);
    columnRefs.current[bounded]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<SVGRectElement>, index: number) => {
    const target =
      event.key === 'ArrowRight' ? index + 1
        : event.key === 'ArrowLeft' ? index - 1
          : event.key === 'Home' ? 0
            : event.key === 'End' ? values.length - 1
              : null;
    if (target === null) return;
    event.preventDefault();
    moveFocus(target);
  };

  const activeValue = active !== null ? values[active] : undefined;
  const averageY = average !== null ? y(average) : null;

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ height: `${heightRem}rem` }}>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={ariaLabel} aria-description={keyboardHint} className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick} aria-hidden="true">
              <line
                x1={MARGIN.left}
                x2={plotRight}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? 'stroke-foreground/15' : 'stroke-foreground/[0.07]'}
              />
              <text
                x={MARGIN.left - LABEL_GAP_REM * rem}
                y={y(tick)}
                dominantBaseline="middle"
                textAnchor="end"
                className="fill-muted-foreground/70 text-[0.6875rem] tabular-nums"
                style={blur}
              >
                {tickLabel(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((index) => (
            <text
              key={index}
              x={center(index)}
              y={height - 0.375 * rem}
              textAnchor="middle"
              className="fill-muted-foreground/70 text-[0.6875rem]"
              aria-hidden="true"
            >
              {index + 1}
            </text>
          ))}

          {values.map((value, index) =>
            value > 0 ? (
              <rect
                key={index}
                x={center(index) - barWidth / 2}
                y={y(value)}
                width={barWidth}
                height={baseline - y(value)}
                rx={2}
                className={average !== null && value > average ? 'fill-foreground/35' : 'fill-foreground/20'}
              />
            ) : null,
          )}

          {averageY !== null && (
            <g aria-hidden="true">
              <line
                x1={MARGIN.left}
                x2={plotRight}
                y1={averageY}
                y2={averageY}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                className="stroke-primary"
              />
              <text
                x={plotRight + LABEL_GAP_REM * rem}
                y={averageY}
                dominantBaseline="middle"
                className="fill-primary text-[0.75rem] tabular-nums"
                style={blur}
              >
                {averageLabel}
              </text>
            </g>
          )}

          {values.map((value, index) => (
            <rect
              key={index}
              ref={(element) => {
                columnRefs.current[index] = element;
              }}
              x={slotLeft(index)}
              y={0}
              width={slot}
              height={baseline + 1}
              tabIndex={index === Math.min(focusIndex, values.length - 1) ? 0 : -1}
              role="img"
              aria-label={isPrivacyMode ? dayTitle(index) : `${dayTitle(index)}: ${formatValue(value)}`}
              className={`cursor-default outline-none ${active === index ? 'fill-foreground/[0.07]' : 'fill-transparent'} focus-visible:stroke-primary focus-visible:stroke-2`}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive((current) => (current === index ? null : current))}
              onFocus={() => {
                setActive(index);
                setFocusIndex(index);
              }}
              onBlur={() => setActive((current) => (current === index ? null : current))}
              onKeyDown={(event) => onKeyDown(event, index)}
            />
          ))}
        </svg>
      )}

      {active !== null && width > 0 && (
        <div
          role="presentation"
          className="glass glass-dense pointer-events-none absolute top-0 z-10 min-w-[8.5rem] rounded-xl px-3 py-2 text-xs"
          style={{
            left: Math.min(Math.max(center(active) + 0.75 * rem, 0), Math.max(0, width - 9.5 * rem)),
          }}
        >
          <div className="mb-1 text-muted-foreground">{dayTitle(active)}</div>
          <div className="tabular-nums text-foreground">
            <SensitiveValue>{formatValue(activeValue ?? 0)}</SensitiveValue>
          </div>
        </div>
      )}
    </div>
  );
}
