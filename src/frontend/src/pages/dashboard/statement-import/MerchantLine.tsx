import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUser } from '@/contexts/user-context';
import type { Category, StatementDraftRow } from '@/lib/api/types';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { includedTotal, pluralKey, signedMoney, type RowState } from './helpers';
import { RowTable } from './RowTable';

interface MerchantLineProps {
  title: string;
  indexes: number[];
  rows: StatementDraftRow[];
  states: RowState[];
  categories: Category[];
  currency: string;
  onChange: (index: number, patch: Partial<RowState>) => void;
  /** Extra content under the rows of an expanded line. */
  footer?: ReactNode;
  /** The line's category picker(s). */
  controls?: ReactNode;
  /** Replaces "N payments", e.g. for the duplicates line. */
  countLabel?: string;
  /** Hide the sum when the line mixes money in and out. */
  showSum?: boolean;
  /** Draws the side line that marks a line still waiting for a category. */
  needsCategory?: boolean;
  defaultOpen?: boolean;
}

/**
 * One line of the review: a merchant (or a bucket of them), its count and sum, and the picker
 * that sets the category of all its rows at once. Expands to the individual rows.
 */
export function MerchantLine({
  title,
  indexes,
  rows,
  states,
  categories,
  currency,
  onChange,
  footer,
  controls,
  countLabel,
  showSum = true,
  needsCategory = false,
  defaultOpen = false,
}: MerchantLineProps) {
  const { t, locale, formatNumber } = useUser();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const { count, sum } = includedTotal(indexes, rows, states);
  const label = countLabel ?? t(pluralKey(locale, count, 'pages.statementImport.payments'), { count: formatNumber(count) });

  return (
    <li
      className={cn(
        'border-b border-border border-l-[3px] pl-3',
        needsCategory ? 'border-l-destructive' : 'border-l-transparent',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 basis-56 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem]">{title}</span>
            <span className="block text-[0.8125rem] text-muted-foreground">{label}</span>
          </span>
        </button>
        {showSum && (
          <span className="w-28 shrink-0 text-right text-[0.9375rem] tabular-nums">
            <SensitiveValue>{signedMoney(sum, (n) => formatMoney(n, currency))}</SensitiveValue>
          </span>
        )}
        {controls && <div className="flex flex-wrap items-center gap-3">{controls}</div>}
      </div>
      {open && (
        <div id={panelId}>
          <RowTable indexes={indexes} rows={rows} states={states} categories={categories} currency={currency} onChange={onChange} />
          {footer}
        </div>
      )}
    </li>
  );
}
