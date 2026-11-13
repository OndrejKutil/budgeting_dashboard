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
    <li className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-[0.6875rem] text-[0.90625rem]', className)}>
      {/* sm and up: one line. The primary text (notes) gives way first, then the secondary text; the
          amount never shrinks. Below sm the secondary text sits under the primary one. */}
      <span className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
        <span className="block truncate sm:shrink-[100]">{primary}</span>
        {secondary && (
          <small className="flex min-w-0 text-[0.8125rem] text-muted-foreground sm:shrink">
            {typeof secondary === 'string' ? <span className="truncate">{secondary}</span> : secondary}
          </small>
        )}
      </span>
      <span className={cn('shrink-0 whitespace-nowrap tabular-nums', AMOUNT_TONE[tone])}>
        <SensitiveValue>{amount}</SensitiveValue>
      </span>
    </li>
  );
}
