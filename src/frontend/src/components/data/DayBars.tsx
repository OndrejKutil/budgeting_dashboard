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
  /** Text label for the reference line, already formatted (amounts hidden by the caller's privacy handling). */
  averageLabel: string;
  formatValue: (value: number) => string;
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
const MARGIN_REM = { left: 0.125, right: 0.125, top: 1.375, bottom: 1.5 };

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
 * Frameless strip of one thin bar per day. Bars above the reference value are slightly
 * brighter; the reference is a dashed amber line with a small label. Each elapsed day is a
 * focusable column (roving tabindex, arrow keys) that shows its date and amount in a tooltip.
 * Plain SVG at the measured width so text keeps its size at every screen width.
 */
export function DayBars({
  values,
  length,
  average,
  averageLabel,
  formatValue,
  dayTitle,
  ariaLabel,
  keyboardHint,
  height: heightRem = 8.75,
}: DayBarsProps) {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>();
  const { isPrivacyMode } = usePrivacyMode();
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const columnRefs = useRef<(SVGRectElement | null)[]>([]);

  // Re-read on every render: a width change (which re-renders) is what accompanies a root size change.
  const rem = rootFontSize();
  const MARGIN = {
    left: MARGIN_REM.left * rem,
    right: MARGIN_REM.right * rem,
    top: MARGIN_REM.top * rem,
    bottom: MARGIN_REM.bottom * rem,
  };
  const height = heightRem * rem;
  const innerWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const slot = innerWidth / Math.max(1, length);
  const barWidth = Math.max(0.125 * rem, Math.min(slot * 0.6, 0.875 * rem));
  const max = Math.max(1, ...values, average ?? 0);
  const baseline = MARGIN.top + innerHeight;
  const y = (value: number) => baseline - (value / max) * innerHeight;
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
          <line x1={0} x2={width} y1={baseline} y2={baseline} className="stroke-foreground/15" />
          {xTicks.map((index) => (
            <text
              key={index}
              x={center(index)}
              y={height - 0.375 * rem}
              textAnchor="middle"
              className="fill-muted-foreground/70 text-[0.6875rem]"
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
            <>
              <line
                x1={0}
                x2={width}
                y1={averageY}
                y2={averageY}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                className="stroke-primary"
              />
              <text
                x={width}
                y={0.6875 * rem}
                textAnchor="end"
                className="fill-primary text-[0.75rem]"
                style={isPrivacyMode ? { filter: 'blur(5px)' } : undefined}
              >
                {averageLabel}
              </text>
            </>
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
              tabIndex={index === focusIndex ? 0 : -1}
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
