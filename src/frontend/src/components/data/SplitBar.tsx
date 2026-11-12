import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { cn } from '@/lib/utils';

export type SplitTone = 'strong' | 'medium' | 'soft' | 'accent';

export interface SplitSegment {
  key: string;
  label: string;
  /** Size of the segment; only positive values are drawn. */
  value: number;
  /** Already formatted share of the whole, e.g. "57 %". */
  percent: string;
  tone: SplitTone;
}

interface SplitBarProps {
  segments: SplitSegment[];
  className?: string;
}

const BAR_TONE: Record<SplitTone, string> = {
  strong: 'bg-foreground/35',
  medium: 'bg-foreground/25',
  soft: 'bg-foreground/[0.14]',
  accent: 'bg-primary',
};

// A segment narrower than this share of the bar cannot carry its own label underneath.
const MIN_ALIGNED_SHARE = 16;

/**
 * One thin bar split into parts, with a label and percentage per part underneath. Labels sit
 * under their segment when every segment is wide enough (and the screen is not a phone);
 * otherwise they become a wrapping list so nothing is clipped.
 */
export function SplitBar({ segments, className }: SplitBarProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  if (visible.length === 0 || total <= 0) return null;

  const aligned = visible.every((segment) => (segment.value / total) * 100 >= MIN_ALIGNED_SHARE);

  return (
    <div className={className}>
      <div className="flex h-2 gap-[3px]" aria-hidden="true">
        {visible.map((segment) => (
          <i
            key={segment.key}
            className={cn('block h-full min-w-[3px] rounded-[2px]', BAR_TONE[segment.tone])}
            style={{ flexGrow: segment.value, flexBasis: 0 }}
          />
        ))}
      </div>

      {aligned && (
        <div className="mt-2 hidden gap-[3px] text-[13px] sm:flex">
          {visible.map((segment) => (
            <span
              key={segment.key}
              className={cn('min-w-0', segment.tone === 'accent' ? 'text-primary' : 'text-muted-foreground')}
              style={{ flexGrow: segment.value, flexBasis: 0 }}
            >
              <span className="block truncate">{segment.label}</span>
              <b className="block text-[15px] font-medium tabular-nums text-foreground">
                <SensitiveValue>{segment.percent}</SensitiveValue>
              </b>
            </span>
          ))}
        </div>
      )}

      <ul className={cn('mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]', aligned && 'sm:hidden')}>
        {visible.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <i className={cn('block h-2 w-2 rounded-[2px]', BAR_TONE[segment.tone])} aria-hidden="true" />
            <span className={segment.tone === 'accent' ? 'text-primary' : 'text-muted-foreground'}>{segment.label}</span>
            <b className="font-medium tabular-nums text-foreground">
              <SensitiveValue>{segment.percent}</SensitiveValue>
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}
