import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { cn } from '@/lib/utils';

export interface LineRow {
  key: string;
  label: string;
  /** Optional small muted text after the label (for example a share), masked in privacy mode. */
  detail?: string;
  /** Already formatted amount. */
  amount: string;
  /** 0..1, relative to the largest row; sets the length of the two-pixel line. */
  ratio: number;
}

interface LineRowsProps {
  rows: LineRow[];
  className?: string;
  /** Colour of the proportional line; amber by default. */
  barClassName?: string;
}

/** Rows whose proportion is a two-pixel line under the row (not a bar in a track). */
export function LineRows({ rows, className, barClassName = 'bg-primary' }: LineRowsProps) {
  return (
    <ul className={className}>
      {rows.map((row) => (
        <li key={row.key} className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 pb-3 pt-2.5 text-[0.90625rem]">
          <span className="min-w-0 truncate" title={row.label}>
            {row.label}
            {row.detail && (
              <small className="ml-2 text-[0.8125rem] text-muted-foreground">
                <SensitiveValue>{row.detail}</SensitiveValue>
              </small>
            )}
          </span>
          <span className="whitespace-nowrap tabular-nums">
            <SensitiveValue>{row.amount}</SensitiveValue>
          </span>
          <span className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden="true" />
          <span
            className={cn('absolute bottom-0 left-0 h-0.5', barClassName)}
            style={{ width: `${Math.max(0, Math.min(1, row.ratio)) * 100}%` }}
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}
