import { useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { CategorySelectItems } from '@/components/import/CategorySelectItems';
import { useUser } from '@/contexts/user-context';
import type { Category, StatementDraftRow } from '@/lib/api/types';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { ROWS_PER_PAGE, signedMoney, type RowState } from './helpers';

interface RowTableProps {
  indexes: number[];
  rows: StatementDraftRow[];
  states: RowState[];
  categories: Category[];
  currency: string;
  onChange: (index: number, patch: Partial<RowState>) => void;
}

/**
 * The transactions of one expanded line: include / exclude, an editable note and a category
 * override per row. Paginated, so a merchant with hundreds of payments stays responsive.
 */
export function RowTable({ indexes, rows, states, categories, currency, onChange }: RowTableProps) {
  const { t, formatDate } = useUser();
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(indexes.length / ROWS_PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const visible = indexes.slice(current * ROWS_PER_PAGE, (current + 1) * ROWS_PER_PAGE);

  return (
    <div className="pb-4 pl-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">{t('pages.statementImport.rowInclude')}</span>
            </TableHead>
            <TableHead className="whitespace-nowrap">{t('common.date')}</TableHead>
            <TableHead className="min-w-[12rem]">{t('common.notes')}</TableHead>
            <TableHead className="text-right">{t('common.amount')}</TableHead>
            <TableHead className="min-w-[11rem]">{t('common.category')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((index) => {
            const row = rows[index];
            const state = states[index];
            const missing = state.included && !state.category;
            return (
              <TableRow key={index} className={cn(!state.included && 'opacity-55')}>
                <TableCell className="align-top">
                  <Checkbox
                    checked={state.included}
                    onCheckedChange={(checked) => onChange(index, { included: checked === true })}
                    aria-label={t('pages.statementImport.rowInclude')}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap align-top text-muted-foreground">
                  {row.date ? formatDate(row.date) : ''}
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    value={state.notes}
                    onChange={(e) => onChange(index, { notes: e.target.value })}
                    aria-label={t('common.notes')}
                    className="h-8 text-sm"
                  />
                  {row.warning && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-warning">
                      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {row.warning}
                    </p>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    'whitespace-nowrap text-right align-top tabular-nums',
                    (row.amount ?? 0) < 0 ? 'text-foreground' : 'text-success',
                  )}
                >
                  <SensitiveValue>{signedMoney(row.amount ?? 0, (n) => formatMoney(n, currency))}</SensitiveValue>
                </TableCell>
                <TableCell className="align-top">
                  <Select value={state.category} onValueChange={(value) => onChange(index, { category: value, manual: true })}>
                    <SelectTrigger
                      aria-label={t('common.category')}
                      className={cn('h-8 text-sm', missing && 'border-destructive')}
                    >
                      <SelectValue placeholder={t('pages.transactions.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <CategorySelectItems categories={categories} t={t} />
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-[0.8125rem] text-muted-foreground">
          <span aria-live="polite">{t('pages.statementImport.rowsPage', { page: current + 1, pages: pageCount })}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={t('pages.statementImport.previousRows')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            aria-label={t('pages.statementImport.nextRows')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
