import { SensitiveValue } from '@/components/privacy/SensitiveValue';

export interface LineRow {
  key: string;
  label: string;
  /** Already formatted amount. */
  amount: string;
  /** 0..1, relative to the largest row; sets the length of the two-pixel line. */
  ratio: number;
}

interface LineRowsProps {
  rows: LineRow[];
  className?: string;
}

/** Rows whose proportion is a two-pixel line under the row (not a bar in a track). */
export function LineRows({ rows, className }: LineRowsProps) {
  return (
    <ul className={className}>
      {rows.map((row) => (
        <li key={row.key} className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 pb-3 pt-2.5 text-[0.90625rem]">
          <span className="min-w-0 truncate">{row.label}</span>
          <span className="whitespace-nowrap tabular-nums">
            <SensitiveValue>{row.amount}</SensitiveValue>
          </span>
          <span className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden="true" />
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-primary"
            style={{ width: `${Math.max(0, Math.min(1, row.ratio)) * 100}%` }}
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}
