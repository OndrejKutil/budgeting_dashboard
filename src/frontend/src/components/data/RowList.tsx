import type { ReactNode } from 'react';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { cn } from '@/lib/utils';

export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('grid [&>li+li]:border-t [&>li+li]:border-border', className)}>{children}</ul>;
}

interface RowListItemProps {
  primary: ReactNode;
  /** Small muted text after (or, on narrow screens, under) the primary text. */
  secondary?: ReactNode;
  /** Already formatted amount, right-aligned and tabular. */
  amount: string;
  tone?: 'negative' | 'positive' | 'muted';
  className?: string;
}

const AMOUNT_TONE = {
  negative: 'text-destructive',
  positive: 'text-success',
  muted: 'text-muted-foreground',
} as const;

export function RowListItem({ primary, secondary, amount, tone = 'muted', className }: RowListItemProps) {
  return (
    <li className={cn('grid grid-cols-[1fr_auto] items-baseline gap-3 py-[11px] text-[14.5px]', className)}>
      <span className="min-w-0">
        <span className="block truncate sm:inline">{primary}</span>
        {secondary && (
          <small className="block truncate text-[13px] text-muted-foreground sm:ml-2 sm:inline">{secondary}</small>
        )}
      </span>
      <span className={cn('whitespace-nowrap tabular-nums', AMOUNT_TONE[tone])}>
        <SensitiveValue>{amount}</SensitiveValue>
      </span>
    </li>
  );
}
