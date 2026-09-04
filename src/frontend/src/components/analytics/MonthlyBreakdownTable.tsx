import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { cn } from '@/lib/utils';

export interface MonthlyBreakdownRow {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  savingsRate: number;
  investmentRate: number;
  profit: number;
  cashflow: number;
}

interface MonthlyBreakdownTableProps {
  rows: MonthlyBreakdownRow[];
  formatCurrency: (value: number) => string;
  onMonthClick?: (month: string) => void;
  labels: {
    month: string;
    income: string;
    expenses: string;
    savings: string;
    investments: string;
    profit: string;
    cashFlow: string;
    total: string;
  };
}

/**
 * Every month's figures in one statement-style table.
 *
 * Deliberately one wide table rather than a small table per chart card: a reader
 * comparing March's savings against March's profit shouldn't have to look in two
 * places, and a two-column table stranded in a wide card leaves its numbers marooned
 * at opposite edges.
 *
 * Colour lives in the header dot, not the digits — a hue strong enough to identify a
 * series is too light to read as text, so the dot ties each column to its chart while
 * the numbers stay in full-contrast ink. Profit and cash flow are the exception: there
 * red carries the *sign*, which is information the number is already making.
 */
export function MonthlyBreakdownTable({
  rows,
  formatCurrency,
  onMonthClick,
  labels,
}: MonthlyBreakdownTableProps) {
  // Every month is shown, including empty ones: a gap in the year is itself worth seeing,
  // and skipping rows makes the table's month column jump in a way the charts above don't.
  const totals = rows.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      expenses: acc.expenses + row.expenses,
      savings: acc.savings + row.savings,
      investments: acc.investments + row.investments,
      profit: acc.profit + row.profit,
      cashflow: acc.cashflow + row.cashflow,
    }),
    { income: 0, expenses: 0, savings: 0, investments: 0, profit: 0, cashflow: 0 },
  );

  const totalSavingsRate = totals.income > 0 ? (totals.savings / totals.income) * 100 : 0;
  const totalInvestmentRate = totals.income > 0 ? (totals.investments / totals.income) * 100 : 0;

  const signClass = (value: number) => (value < 0 ? 'text-destructive' : 'text-foreground');

  const Head = ({ label, dot }: { label: string; dot?: string }) => (
    <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden />}
        {label}
      </span>
    </th>
  );

  /** Amount with its share-of-income rate tucked underneath, so no column is spent on it. */
  const RateCell = ({ amount, rate }: { amount: number; rate: number }) => (
    <td className="whitespace-nowrap px-4 py-2.5 text-right">
      <span className="block font-medium tabular-nums text-foreground">
        <SensitiveValue>{formatCurrency(amount)}</SensitiveValue>
      </span>
      <span className="block text-[11px] tabular-nums text-muted-foreground">
        <SensitiveValue>{rate.toFixed(1)}%</SensitiveValue>
      </span>
    </td>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {labels.month}
            </th>
            <Head label={labels.income} dot="hsl(var(--chart-income))" />
            <Head label={labels.expenses} dot="hsl(var(--chart-expense))" />
            <Head label={labels.savings} dot="hsl(var(--chart-savings))" />
            <Head label={labels.investments} dot="hsl(var(--chart-investment))" />
            <Head label={labels.profit} />
            <Head label={labels.cashFlow} />
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.month}
              onClick={onMonthClick ? () => onMonthClick(row.month) : undefined}
              className={cn(
                'border-b border-border/40 transition-colors',
                index % 2 === 1 && 'bg-muted/20',
                onMonthClick && 'cursor-pointer hover:bg-muted/60',
              )}
            >
              <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-muted-foreground">
                {row.month}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                <SensitiveValue>{formatCurrency(row.income)}</SensitiveValue>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                <SensitiveValue>{formatCurrency(row.expenses)}</SensitiveValue>
              </td>
              <RateCell amount={row.savings} rate={row.savingsRate} />
              <RateCell amount={row.investments} rate={row.investmentRate} />
              <td className={cn('whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums', signClass(row.profit))}>
                <SensitiveValue>{formatCurrency(row.profit)}</SensitiveValue>
              </td>
              <td className={cn('whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums', signClass(row.cashflow))}>
                <SensitiveValue>{formatCurrency(row.cashflow)}</SensitiveValue>
              </td>
            </tr>
          ))}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {labels.total}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-foreground">
                <SensitiveValue>{formatCurrency(totals.income)}</SensitiveValue>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-foreground">
                <SensitiveValue>{formatCurrency(totals.expenses)}</SensitiveValue>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <span className="block font-bold tabular-nums text-foreground">
                  <SensitiveValue>{formatCurrency(totals.savings)}</SensitiveValue>
                </span>
                <span className="block text-[11px] tabular-nums text-muted-foreground">
                  <SensitiveValue>{totalSavingsRate.toFixed(1)}%</SensitiveValue>
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <span className="block font-bold tabular-nums text-foreground">
                  <SensitiveValue>{formatCurrency(totals.investments)}</SensitiveValue>
                </span>
                <span className="block text-[11px] tabular-nums text-muted-foreground">
                  <SensitiveValue>{totalInvestmentRate.toFixed(1)}%</SensitiveValue>
                </span>
              </td>
              <td className={cn('whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums', signClass(totals.profit))}>
                <SensitiveValue>{formatCurrency(totals.profit)}</SensitiveValue>
              </td>
              <td className={cn('whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums', signClass(totals.cashflow))}>
                <SensitiveValue>{formatCurrency(totals.cashflow)}</SensitiveValue>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
