import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { CATEGORY_CHART_COLORS } from '@/lib/chart-colors';

export interface CategoryRow {
  name: string;
  value: number;
}

interface CategoryBreakdownTableProps {
  rows: CategoryRow[];
  formatCurrency: (value: number) => string;
  /** Share of the total as a 0..1 ratio, formatted for the locale ("12.5 %"). */
  formatShare: (ratio: number) => string;
  labels: {
    category: string;
    amount: string;
    share: string;
    total: string;
  };
}

/**
 * Every expense category, ranked, in the boxless table language: rank, category with a small
 * dot, share of the total with a two-pixel line, amount, and a total row. Used by the Monthly
 * analytics page only.
 */
export function CategoryBreakdownTable({ rows, formatCurrency, formatShare, labels }: CategoryBreakdownTableProps) {
  const { sorted, total, max } = useMemo(() => {
    const sortedRows = rows.slice().sort((a, b) => b.value - a.value);
    return {
      sorted: sortedRows,
      total: sortedRows.reduce((sum, row) => sum + row.value, 0),
      max: sortedRows.length > 0 ? Math.max(...sortedRows.map((r) => r.value)) : 0,
    };
  }, [rows]);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[2rem] text-muted-foreground/70">#</TableHead>
          <TableHead className="text-muted-foreground/70">{labels.category}</TableHead>
          <TableHead className="w-[38%] text-muted-foreground/70 max-sm:w-[4.5rem]">{labels.share}</TableHead>
          <TableHead className="text-right text-muted-foreground/70">{labels.amount}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {sorted.map((row, index) => {
          const share = total > 0 ? row.value / total : 0;
          const barWidth = max > 0 ? (row.value / max) * 100 : 0;
          const color = CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length];

          return (
            <TableRow key={row.name} className="tabular-nums">
              <TableCell className="text-[0.8125rem] text-muted-foreground/70">{index + 1}</TableCell>
              <TableCell className="w-full max-w-0">
                <span className="flex min-w-0 items-center gap-2" title={row.name}>
                  <span
                    className="h-[0.375rem] w-[0.375rem] shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">{row.name}</span>
                </span>
              </TableCell>
              <TableCell>
                <span className="flex flex-col gap-1.5">
                  <span className="whitespace-nowrap text-[0.8125rem] text-muted-foreground">
                    <SensitiveValue>{formatShare(share)}</SensitiveValue>
                  </span>
                  <span className="block h-0.5 max-sm:hidden" aria-hidden="true">
                    <span className="block h-full bg-primary" style={{ width: `${barWidth}%` }} />
                  </span>
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <SensitiveValue>{formatCurrency(row.value)}</SensitiveValue>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>

      {sorted.length > 0 && (
        <TableFooter>
          <TableRow className="tabular-nums hover:bg-transparent">
            <TableCell colSpan={3} className="font-medium">
              {labels.total}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-medium">
              <SensitiveValue>{formatCurrency(total)}</SensitiveValue>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
