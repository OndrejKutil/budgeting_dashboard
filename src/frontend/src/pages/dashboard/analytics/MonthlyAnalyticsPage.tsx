import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthlyAnalyticsSkeleton } from '@/components/skeletons';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { DayBars } from '@/components/data/DayBars';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { DeferredRender } from '@/components/performance/DeferredRender';
import { StatementDocument, type StatementTable } from '@/components/analytics/StatementDocument';
import { CategoryBreakdownTable } from '@/components/analytics/CategoryBreakdownTable';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { useUser } from '@/contexts/user-context';
import { useAvailableYears } from '@/hooks/use-available-years';
import { useUrlPeriod } from '@/hooks/use-url-state';
import { analyticsApi } from '@/lib/api/endpoints';
import type { CategoryBreakdownData, MonthlyAnalytics } from '@/lib/api/types/base';
import { formatMoney, formatMoneyParts, formatMoneyWhole } from '@/lib/currency';

const MAX_CATEGORY_ROWS = 5;

const SPENDING_TYPES = ['Core', 'Necessary', 'Fun', 'Future'] as const;

/** A value that displays as 0 is 0: no "-0". */
const whole = (value: number) => (Math.abs(value) < 0.5 ? 0 : value);

export default function MonthlyAnalyticsPage() {
  const { formatDate, formatMonth, formatNumber, formatCurrency, t, currency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const { month, year, setPeriod } = useUrlPeriod();
  const years = useAvailableYears({ include: year });

  const now = useMemo(() => new Date(), []);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const monthLong = formatMonth(month - 1, 'long');
  const daysInMonth = new Date(year, month, 0).getDate();

  const { data, isLoading, error, refetch, isFetching } = useQuery<MonthlyAnalytics>({
    queryKey: ['monthly-analytics', { year, month, currency }],
    queryFn: async () => {
      const result = await analyticsApi.getMonthly({ year, month, base_currency: currency });
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.message || t('pages.monthlyAnalytics.loadFailed'));
    },
    placeholderData: keepPreviousData,
  });

  const money = (value: number) => formatMoneyWhole(value, currency);
  const percent = (ratio: number, digits = 1) =>
    formatNumber(ratio, { style: 'percent', maximumFractionDigits: digits });
  const symbol = formatMoneyParts(0, currency, 0).find((part) => part.type === 'currency')?.value ?? currency;

  const header = (canExport: boolean) => (
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:mb-10">
      <h1 className="min-w-0 text-[1.5rem] font-medium tracking-tight text-foreground sm:text-[1.625rem]">
        {formatDate(new Date(year, month - 1, 1), { month: 'long', year: 'numeric' })}
        <span className="ml-3 whitespace-nowrap text-[1rem] font-normal text-muted-foreground">
          {t('pages.monthlyAnalytics.title')}
        </span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <PeriodNavigator
          mode="month"
          month={month}
          year={year}
          years={years}
          onChange={setPeriod}
          className="[&>div:first-child]:gap-1 [&>div:first-child]:border-transparent [&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:shadow-none"
        />
        <Button variant="outline" className="h-11 px-4" onClick={() => window.print()} disabled={!canExport}>
          <FileDown className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          {t('pages.monthlyAnalytics.exportPdf')}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="screen-content">
        {header(false)}
        <MonthlyAnalyticsSkeleton label={t('pages.monthlyAnalytics.loading')} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="screen-content">
        {header(false)}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.monthlyAnalytics.errorTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('states.noDataAvailable')}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const buildTable = (title: string, rows: CategoryBreakdownData[]): StatementTable => {
    const sorted = rows.slice().sort((a, b) => b.total - a.total);
    return {
      title,
      rows: sorted.map((r) => ({ label: r.category, value: formatCurrency(r.total) })),
      total: { label: t('statement.total'), value: formatCurrency(rows.reduce((s, r) => s + r.total, 0)) },
    };
  };

  const statementTables: StatementTable[] = [
    buildTable(t('statement.incomeByCategory'), data.income_breakdown),
    buildTable(t('statement.expensesByCategory'), data.expenses_breakdown),
    buildTable(t('statement.savingsByCategory'), data.saving_breakdown),
    buildTable(t('statement.investmentsByCategory'), data.investment_breakdown),
  ];

  const statement = (
    <div className="print-statement">
      <StatementDocument
        brand={t('appName')}
        title={t('statement.monthlyTitle')}
        period={`${monthLong} ${year}`}
        summary={[
          { label: t('metrics.income'), value: formatCurrency(data.income), tone: 'income' },
          { label: t('metrics.expenses'), value: formatCurrency(data.expenses), tone: 'expense' },
          { label: t('metrics.savings'), value: formatCurrency(data.savings) },
          { label: t('metrics.investments'), value: formatCurrency(data.investments) },
          { label: t('metrics.profit'), value: formatCurrency(data.profit), emphasis: true, tone: data.profit >= 0 ? 'income' : 'expense' },
          { label: t('metrics.cashFlow'), value: formatCurrency(data.cashflow) },
        ]}
        tables={statementTables}
      />
    </div>
  );

  const isEmpty =
    whole(data.income) === 0 &&
    whole(data.expenses) === 0 &&
    whole(data.savings) === 0 &&
    whole(data.investments) === 0 &&
    data.income_breakdown.length === 0 &&
    data.expenses_breakdown.length === 0 &&
    data.saving_breakdown.length === 0 &&
    data.investment_breakdown.length === 0;

  if (isEmpty) {
    return (
      <>
        <div className="screen-content">
          {header(true)}
          <div className="flex min-h-[20rem] flex-col items-center justify-center gap-2 text-center">
            <p className="text-[1.1875rem] font-light">
              {t('pages.monthlyAnalytics.emptyTitle', { month: `${monthLong} ${year}` })}
            </p>
            <p className="max-w-[40ch] text-sm text-muted-foreground">{t('pages.monthlyAnalytics.emptyDescription')}</p>
            {!isCurrentMonth && (
              <Button variant="ghost" className="mt-2" onClick={() => setPeriod(now.getMonth() + 1, now.getFullYear())}>
                {t('common.thisMonth')}
              </Button>
            )}
          </div>
        </div>
        {statement}
      </>
    );
  }

  // ---- Figures, each compared with its six-month average ----------------------------------------
  const average = data.six_month_average;
  const income = whole(data.income);
  const expenses = whole(data.expenses);
  const saved = whole(data.savings);
  const invested = whole(data.investments);
  const profit = whole(data.profit);
  const cashflow = whole(data.cashflow);
  const parts = (value: number) => formatMoneyParts(value, currency, 0);
  const ofIncome = (rate: number) => (income > 0 ? t('metrics.ofIncome', { rate: percent(rate / 100) }) : undefined);

  const metrics: Metric[] = [
    {
      key: 'income',
      label: t('metrics.income'),
      value: income,
      parts: parts(income),
      comparison: { average: average?.income, direction: 'higherIsBetter', unit: 'percent' },
    },
    {
      key: 'expenses',
      label: t('metrics.expenses'),
      value: expenses,
      parts: parts(expenses),
      comparison: { average: average?.expenses, direction: 'lowerIsBetter', unit: 'percent' },
    },
    {
      key: 'saved',
      label: t('metrics.saved'),
      value: saved,
      parts: parts(saved),
      sub: ofIncome(data.savings_rate),
      comparison: { average: average?.savings, direction: 'higherIsBetter', unit: 'percent' },
    },
    {
      key: 'invested',
      label: t('metrics.invested'),
      value: invested,
      parts: parts(invested),
      sub: ofIncome(data.investment_rate),
      comparison: { average: average?.investments, direction: 'higherIsBetter', unit: 'percent' },
    },
    {
      key: 'profit',
      label: t('metrics.profit'),
      value: profit,
      parts: parts(profit),
      comparison: { average: average?.profit, direction: 'higherIsBetter', unit: 'amount' },
    },
    {
      key: 'cashflow',
      label: t('metrics.cashFlow'),
      value: cashflow,
      parts: parts(cashflow),
      accent: true,
      comparison: { average: average?.cashflow, direction: 'higherIsBetter', unit: 'amount' },
    },
  ];

  // ---- Daily spending strip --------------------------------------------------------------------
  const elapsedDays = Math.max(0, Math.min(data.run_rate.days_elapsed, daysInMonth));
  const dailyValues = Array.from({ length: elapsedDays }, () => 0);
  for (const item of data.daily_spending_heatmap) {
    const day = Number(item.day.slice(8, 10));
    if (day >= 1 && day <= elapsedDays) dailyValues[day - 1] += Number(item.amount);
  }
  const hasSpending = dailyValues.some((value) => value > 0);
  // The month's own average spending per elapsed day (expenses / days elapsed), from the API.
  const dailyAverage = elapsedDays > 0 ? data.run_rate.average_daily_spend : null;
  const averageLabel = dailyAverage === null ? '' : t('pages.monthlyAnalytics.averageLine', { amount: money(dailyAverage) });
  const chartAria = [
    t('pages.monthlyAnalytics.chartAria', { month: monthLong }),
    !isPrivacyMode && dailyAverage !== null
      ? t('pages.monthlyAnalytics.chartAriaAverage', { amount: money(dailyAverage) })
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  // ---- Lists ------------------------------------------------------------------------------------
  const share = (value: number, total: number) => {
    const ratio = total > 0 ? value / total : 0;
    return percent(ratio, ratio < 0.1 ? 1 : 0);
  };
  const toRows = (items: { key: string; label: string; value: number; detail?: string }[]): LineRow[] => {
    const largest = Math.max(...items.map((item) => item.value), 0);
    return items.map((item) => ({
      key: item.key,
      label: item.label,
      detail: item.detail,
      amount: money(item.value),
      ratio: largest > 0 ? item.value / largest : 0,
    }));
  };

  const expenseSorted = data.expenses_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value);
  const expenseItems = expenseSorted.slice(0, MAX_CATEGORY_ROWS).map((item) => ({ key: item.name, label: item.name, value: item.value }));
  const expenseRest = expenseSorted.slice(MAX_CATEGORY_ROWS);
  if (expenseRest.length > 0) {
    expenseItems.push({
      key: '__other',
      label: t('analytics.other'),
      value: expenseRest.reduce((sum, item) => sum + item.value, 0),
    });
  }
  const expenseRows = toRows(expenseItems);

  const incomeSorted = data.income_breakdown
    .map((item) => ({ name: item.category, value: Number(item.total) }))
    .sort((a, b) => b.value - a.value);
  const incomeTotal = incomeSorted.reduce((sum, item) => sum + item.value, 0);
  const incomeRows = toRows(
    incomeSorted.map((item) => ({ key: item.name, label: item.name, value: item.value, detail: share(item.value, incomeTotal) })),
  );

  const spendingTypeLabels: Record<string, string> = {
    Core: t('types.core'),
    Necessary: t('types.necessary'),
    Fun: t('types.fun'),
    Future: t('types.future'),
  };
  const spendingSorted = data.spending_type_breakdown
    .map((item) => ({ type: item.type, value: Number(item.amount) }))
    .sort((a, b) => b.value - a.value);
  const spendingTotal = spendingSorted.reduce((sum, item) => sum + item.value, 0);
  const spendingRows = toRows(
    spendingSorted.map((item) => ({
      key: item.type,
      label: (SPENDING_TYPES as readonly string[]).includes(item.type) ? spendingTypeLabels[item.type] : item.type,
      value: item.value,
      detail: share(item.value, spendingTotal),
    })),
  );

  const columnHeading = 'mb-1.5 text-[0.8125rem] font-normal text-muted-foreground';
  const emptyText = 'py-3 text-sm text-muted-foreground';

  return (
    <>
      <div className="screen-content">
        {header(true)}

        <section aria-label={t('pages.monthlyAnalytics.title')}>
          <MetricGrid metrics={metrics} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" formatAmount={money} />
        </section>

        <section className="mt-11">
          <h2 className={columnHeading}>
            {t('pages.monthlyAnalytics.dailySpending')}, {symbol}
          </h2>
          {hasSpending ? (
            <DayBars
              values={dailyValues}
              length={daysInMonth}
              average={dailyAverage}
              averageLabel={averageLabel}
              formatValue={(value) => formatMoney(value, currency)}
              formatAxis={(value) => formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 })}
              dayTitle={(index) =>
                formatDate(new Date(year, month - 1, index + 1), { weekday: 'short', month: 'short', day: 'numeric' })
              }
              ariaLabel={chartAria}
              keyboardHint={t('pages.monthlyAnalytics.chartKeyboardHint')}
            />
          ) : (
            <p className="py-8 text-sm text-muted-foreground">{t('pages.monthlyAnalytics.noSpending')}</p>
          )}
        </section>

        <section className="mt-11 grid gap-x-14 gap-y-10 lg:grid-cols-[1.1fr_1fr_1fr]">
          <div className="min-w-0">
            <h2 className={columnHeading}>{t('pages.monthlyAnalytics.expenseCategories')}</h2>
            {expenseRows.length > 0 ? (
              <LineRows rows={expenseRows} />
            ) : (
              <p className={emptyText}>{t('pages.monthlyAnalytics.noExpenseData')}</p>
            )}
          </div>
          <div className="min-w-0">
            <h2 className={columnHeading}>{t('pages.monthlyAnalytics.incomeSources')}</h2>
            {incomeRows.length > 0 ? (
              <LineRows rows={incomeRows} barClassName="bg-success" />
            ) : (
              <p className={emptyText}>{t('pages.monthlyAnalytics.noIncomeData')}</p>
            )}
          </div>
          <div className="min-w-0">
            <h2 className={columnHeading}>{t('pages.monthlyAnalytics.spendingType')}</h2>
            {spendingRows.length > 0 ? (
              <LineRows rows={spendingRows} barClassName="bg-foreground/60" />
            ) : (
              <p className={emptyText}>{t('pages.monthlyAnalytics.noSpendingTypeData')}</p>
            )}
          </div>
        </section>

        {expenseSorted.length > 0 && (
          <DeferredRender className="mt-14" fallback={<div className="mt-14 min-h-[20rem]" />}>
            <h2 className={columnHeading}>{t('pages.monthlyAnalytics.allExpenseCategories')}</h2>
            <CategoryBreakdownTable
              rows={expenseSorted}
              formatCurrency={money}
              formatShare={(ratio) => percent(ratio)}
              labels={{
                category: t('common.category'),
                amount: t('common.amount'),
                share: t('analytics.share'),
                total: t('statement.total'),
              }}
            />
          </DeferredRender>
        )}
      </div>

      {statement}
    </>
  );
}
