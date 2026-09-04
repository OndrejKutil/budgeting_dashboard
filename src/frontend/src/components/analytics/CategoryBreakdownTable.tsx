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
  labels: {
    category: string;
    amount: string;
    share: string;
    total: string;
  };
}

/**
 * Category amounts as a ranked table rather than a wide bar chart. Each row carries a
 * proportional bar behind the share cell, so the visual comparison a bar chart gives you
 * survives — but the labels and exact figures stay readable no matter how many categories
 * there are.
 */
export function CategoryBreakdownTable({ rows, formatCurrency, labels }: CategoryBreakdownTableProps) {
  const { sorted, total, max } = useMemo(() => {
    const sortedRows = rows.slice().sort((a, b) => b.value - a.value);
    return {
      sorted: sortedRows,
      total: sortedRows.reduce((sum, row) => sum + row.value, 0),
      max: sortedRows.length > 0 ? Math.max(...sortedRows.map((r) => r.value)) : 0,
    };
  }, [rows]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              #
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {labels.category}
            </TableHead>
            <TableHead className="w-[38%] text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {labels.share}
            </TableHead>
            <TableHead className="text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {labels.amount}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((row, index) => {
            const share = total > 0 ? (row.value / total) * 100 : 0;
            const barWidth = max > 0 ? (row.value / max) * 100 : 0;
            const color = CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length];

            return (
              <TableRow key={row.name} className="tabular-nums">
                <TableCell className="text-xs text-muted-foreground/60">{index + 1}</TableCell>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="truncate">{row.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 min-w-[40px] flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${barWidth}%`, backgroundColor: color, opacity: 0.85 }}
                      />
                    </span>
                    <span className="w-11 shrink-0 text-right text-xs text-muted-foreground">
                      <SensitiveValue>{share.toFixed(1)}%</SensitiveValue>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <SensitiveValue>{formatCurrency(row.value)}</SensitiveValue>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>

        {sorted.length > 0 && (
          <TableFooter>
            <TableRow className="tabular-nums hover:bg-transparent">
              <TableCell colSpan={3} className="font-bold">
                {labels.total}
              </TableCell>
              <TableCell className="text-right font-bold">
                <SensitiveValue>{formatCurrency(total)}</SensitiveValue>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
