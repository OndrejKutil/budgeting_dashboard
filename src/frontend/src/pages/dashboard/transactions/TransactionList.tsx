import { AlertCircle, ChevronLeft, ChevronRight, Copy, MoreHorizontal, Pencil, Receipt, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUser } from '@/contexts/user-context';
import type { Account, Category, SavingsFund, Transaction } from '@/lib/api/types';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { typeColor } from './helpers';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  categoryMap: Record<number, Category>;
  accountMap: Record<string, Account>;
  fundMap: Record<string, SavingsFund>;
  page: number;
  setPage: (page: number) => void;
  rangeStart: number;
  rangeEnd: number;
  hasNextPage: boolean;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onCopy: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

function TagChips({ tags }: { tags: Transaction['tags'] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map(tag => (
        <span
          key={tag.tags_id_pk}
          className="rounded-full bg-foreground/[0.07] px-2 py-px text-[11px] leading-4 text-muted-foreground"
        >
          {tag.tag_name}
        </span>
      ))}
    </div>
  );
}

/** Signed amount in the account's own currency: negative red, positive green, zero muted. */
function Amount({ transaction, account, className }: { transaction: Transaction; account?: Account; className?: string }) {
  const sign = transaction.amount > 0 ? '+' : transaction.amount < 0 ? '−' : '';
  return (
    <span
      className={cn(
        'tabular-nums',
        transaction.amount > 0 ? 'text-success' : transaction.amount < 0 ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      <SensitiveValue>
        {sign}{formatMoney(Math.abs(transaction.amount), account?.currency || 'CZK')}
      </SensitiveValue>
    </span>
  );
}

function RowActions({
  transaction,
  onEdit,
  onCopy,
  onDelete,
  className,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onCopy: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  className?: string;
}) {
  const { t } = useUser();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${t('common.actions')}: ${transaction.notes || t('pages.transactions.noDescription')}`}
          className={cn('-my-1.5 h-8 w-8', className)}
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(transaction)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('common.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopy(transaction)}>
          <Copy className="mr-2 h-4 w-4" />
          {t('common.duplicate')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColumnHeaders() {
  const { t } = useUser();
  return (
    <TableHeader>
      <TableRow className="border-b hover:bg-transparent">
        <TableHead className="w-32 first:pl-4">{t('common.date')}</TableHead>
        <TableHead>{t('common.notes')}</TableHead>
        <TableHead>{t('common.category')}</TableHead>
        <TableHead>{t('common.account')}</TableHead>
        <TableHead className="hidden lg:table-cell">{t('pages.transactions.fund')}</TableHead>
        <TableHead className="text-right">{t('common.amount')}</TableHead>
        <TableHead className="w-12">
          <span className="sr-only">{t('common.actions')}</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ListSkeleton() {
  return (
    <>
      <div className="hidden md:block" aria-hidden="true">
        <Table>
          <ColumnHeaders />
          <TableBody>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell className="first:pl-4"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-border py-3.5 pl-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

export function TransactionList({
  transactions,
  isLoading,
  error,
  onRetry,
  categoryMap,
  accountMap,
  fundMap,
  page,
  setPage,
  rangeStart,
  rangeEnd,
  hasNextPage,
  onAdd,
  onEdit,
  onCopy,
  onDelete,
}: TransactionListProps) {
  const { t, formatDate } = useUser();

  if (error && !isLoading && transactions.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <AlertCircle className="mb-4 h-8 w-8 text-destructive" aria-hidden="true" />
        <h3 className="text-lg font-medium">{t('pages.transactions.failedToLoad')}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (isLoading) return <ListSkeleton />;

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
        title={t('pages.transactions.noTransactionsTitle')}
        description={t('pages.transactions.noTransactionsDescription')}
        action={{ label: t('pages.transactions.add'), onClick: onAdd }}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <ColumnHeaders />
          <TableBody>
            {transactions.map(transaction => {
              const category = categoryMap[transaction.category_id_fk];
              const account = accountMap[transaction.account_id_fk];
              const fund = transaction.savings_fund_id_fk ? fundMap[transaction.savings_fund_id_fk] : null;
              const color = typeColor(category?.type || 'expense');
              return (
                <TableRow key={transaction.id_pk} className="group">
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground first:pl-4"
                    // The type side line: 2px on the row's left edge, coloured by category type.
                    style={{ boxShadow: `inset 2px 0 0 ${color}` }}
                  >
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell>
                    <span className="text-foreground">{transaction.notes || '-'}</span>
                    <TagChips tags={transaction.tags} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-muted-foreground transition-colors group-hover:text-foreground">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {category?.category_name || t('common.unknown')}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account?.account_name || t('common.unknown')}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {fund ? fund.fund_name : <span className="text-muted-foreground/40">-</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Amount transaction={transaction} account={account} />
                  </TableCell>
                  <TableCell className="pr-0 text-right last:pr-0">
                    <RowActions
                      transaction={transaction}
                      onEdit={onEdit}
                      onCopy={onCopy}
                      onDelete={onDelete}
                      className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile rows: notes with "category · date" beneath, amount on the right */}
      <ul className="md:hidden">
        {transactions.map(transaction => {
          const category = categoryMap[transaction.category_id_fk];
          const account = accountMap[transaction.account_id_fk];
          const color = typeColor(category?.type || 'expense');
          return (
            <li
              key={transaction.id_pk}
              className="flex items-center gap-2 border-b border-border py-3 pl-3.5"
              style={{ boxShadow: `inset 2px 0 0 ${color}` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-foreground">
                  {transaction.notes || t('pages.transactions.noDescription')}
                </p>
                {/* Category and account give way first; the date always stays whole. */}
                <p className="flex min-w-0 gap-1 text-[13px] text-muted-foreground">
                  <span className="min-w-0 shrink truncate">{category?.category_name || t('common.unknown')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="min-w-0 shrink truncate">{account?.account_name || t('common.unknown')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0 whitespace-nowrap">{formatDate(transaction.date)}</span>
                </p>
                <TagChips tags={transaction.tags} />
              </div>
              <Amount transaction={transaction} account={account} className="shrink-0 text-[15px]" />
              <RowActions transaction={transaction} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} className="-mr-2 shrink-0" />
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 pt-5">
        <p className="text-[13px] text-muted-foreground">
          {t('pages.transactions.showing')} <span className="text-foreground tabular-nums">{rangeStart}</span>&ndash;
          <span className="text-foreground tabular-nums">{rangeEnd}</span> {t('pages.transactions.showingSuffix')}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(1)}
            className="hidden sm:inline-flex"
          >
            {t('pages.transactions.newest')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage(page + 1)}
          >
            {t('common.next')}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
}
