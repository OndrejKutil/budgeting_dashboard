import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OverviewSkeleton } from '@/components/skeletons';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { SplitBar, type SplitSegment } from '@/components/data/SplitBar';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { RowList, RowListItem } from '@/components/data/RowList';
import { ChartLegend } from '@/components/data/ChartLegend';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { SeriesLineChart } from '@/components/data/SeriesLineChart';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { useUser } from '@/contexts/user-context';
import { accountsApi, analyticsApi, categoriesApi, summaryApi, transactionsApi } from '@/lib/api/endpoints';
import type { SummaryData } from '@/lib/api/types';
import { formatMoney, formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { useAvailableYears } from '@/hooks/use-available-years';
import { useOpenAddTransaction } from '@/hooks/use-add-transaction';
import { useUrlPeriod } from '@/hooks/use-url-state';

const MAX_CATEGORY_ROWS = 5;
const LATEST_COUNT = 5;
/** Rows shown below the desktop breakpoint, where the page is a single long column. */
const LATEST_COUNT_COMPACT = 3;

const pad = (value: number) => String(value).padStart(2, '0');
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
/** Differences under half a unit disappear when amounts are shown whole. */
const isZero = (value: number) => Math.abs(value) < 0.5;
/** A value that displays as 0 is 0: no "-0", no red zero, no "0 short". */
const whole = (value: number) => (isZero(value) ? 0 : value);

const loadSummary = async (year: number, month: number, baseCurrency: string, fallbackMessage: string): Promise<SummaryData> => {
  const response = await summaryApi.get({
    start_date: `${year}-${pad(month)}-01`,
    end_date: isoDate(new Date(year, month, 0)),
    base_currency: baseCurrency,
  });
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || fallbackMessage);
};

export default function DashboardOverview() {
  const { formatNumber, formatDate, formatMonth, t, currency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const queryClient = useQueryClient();
  const openAddTransaction = useOpenAddTransaction();
  const { month, year, setPeriod } = useUrlPeriod();
  const years = useAvailableYears({ include: year });

  const now = useMemo(() => new Date(), []);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLong = formatMonth(month - 1, 'long');
  const monthYear = formatDate(new Date(year, month - 1, 1), { month: 'long', year: 'numeric' });

  const { data, isLoading, error, refetch, isFetching } = useQuery<SummaryData>({
    queryKey: ['summary', { year, month, currency }],
    queryFn: () => loadSummary(year, month, currency, t('pages.overview.loadSummaryFailed')),
  });

  // Latest transactions of the selected month (up to today for the current one).
  const latestEnd = isCurrentMonth ? now : new Date(year, month, 0);
  const latestStart = new Date(year, month - 1, 1);
  const latestInRange = latestEnd >= latestStart;
  const { data: latest = [] } = useQuery({
    queryKey: ['transactions', 'overview-latest', { start: isoDate(latestStart), end: isoDate(latestEnd) }],
    queryFn: async () => {
      const response = await transactionsApi.getAll({
        start_date: isoDate(latestStart),
        end_date: isoDate(latestEnd),
        limit: LATEST_COUNT,
      });
      return (response.data ?? []).slice(0, LATEST_COUNT);
    },
    enabled: latestInRange,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesApi.getAll()).data || [],
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await accountsApi.getAll()).data || [],
  });

  // Warm the monthly analytics page the chart links to.
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['monthly-analytics', { year, month, currency }],
      queryFn: async () => {
        const response = await analyticsApi.getMonthly({ year, month, base_currency: currency });
        if (response.success && response.data) return response.data;
        throw new Error(response.message || t('pages.overview.loadMonthlyFailed'));
      },
    });
  }, [month, year, currency, queryClient, t]);

  const money = (value: number) => formatMoneyWhole(value, currency);
  const percentOf = (value: number, whole: number) =>
    formatNumber(whole > 0 ? value / whole : 0, { style: 'percent', maximumFractionDigits: 0 });

  const view = useMemo(() => {
    if (!data) return null;

    const income = whole(data.total_income);
    const expense = whole(data.total_expense);
    const saving = whole(data.total_saving);
    const investing = whole(data.total_investment);
    // As the API defines them: profit = income - expenses - investing,
    // net cash flow = profit - saving.
    const profit = whole(data.profit);
    const left = whole(data.net_cash_flow);

    const average = data.six_month_average;
    const parts = (value: number) => formatMoneyParts(value, currency, 0);
    const ofIncome = (value: number) =>
      income > 0 ? t('metrics.ofIncome', { rate: percentOf(value, income) }) : undefined;

    const leadMetrics: Metric[] = [
      {
        key: 'cashFlow',
        label: t('metrics.cashFlow'),
        value: left,
        parts: parts(left),
        comparison: { average: average?.net_cash_flow, direction: 'higherIsBetter', unit: 'amount' },
      },
      {
        key: 'profit',
        label: t('metrics.profit'),
        value: profit,
        parts: parts(profit),
        comparison: { average: average?.profit, direction: 'higherIsBetter', unit: 'amount' },
      },
    ];
    const detailMetrics: Metric[] = [
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
        value: expense,
        parts: parts(expense),
        comparison: { average: average?.expense, direction: 'lowerIsBetter', unit: 'percent' },
      },
      {
        key: 'saved',
        label: t('metrics.saved'),
        value: saving,
        parts: parts(saving),
        sub: ofIncome(saving),
        comparison: { average: average?.saving, direction: 'higherIsBetter', unit: 'percent' },
      },
      {
        key: 'invested',
        label: t('metrics.invested'),
        value: investing,
        parts: parts(investing),
        sub: ofIncome(investing),
        comparison: { average: average?.investment, direction: 'higherIsBetter', unit: 'percent' },
      },
    ];

    // The bar splits the money the month had to work with. That is income, unless more was taken
    // out of savings than put in: then net saving is negative (and drawn as nothing) and the net
    // withdrawal is extra money to spend, so it joins the whole. Spent + saved + invested + cash
    // flow then always add up to 100 %.
    const fromSavings = saving < 0 ? -saving : 0;
    const available = income + fromSavings;
    const splitSegments: SplitSegment[] =
      available > 0
        ? [
            { key: 'spent', label: t('pages.overview.spent'), value: expense, percent: percentOf(expense, available), tone: 'strong' },
            { key: 'saved', label: t('pages.overview.saved'), value: saving, percent: percentOf(saving, available), tone: 'soft' },
            { key: 'invested', label: t('pages.overview.invested'), value: investing, percent: percentOf(investing, available), tone: 'medium' },
            { key: 'left', label: t('pages.overview.left'), value: left, percent: percentOf(left, available), tone: 'accent' },
          ]
        : [];

    const sorted = data.expense_categories;
    const top = sorted.slice(0, MAX_CATEGORY_ROWS);
    const rest = sorted.slice(MAX_CATEGORY_ROWS);
    const rows = top.map((category) => ({ key: category.name, label: category.name, value: category.total }));
    if (rest.length > 0) {
      rows.push({ key: '__other', label: t('pages.overview.other'), value: rest.reduce((sum, category) => sum + category.total, 0) });
    }
    const largest = Math.max(...rows.map((row) => row.value), 0);
    const categoryRows: LineRow[] = rows.map((row) => ({
      key: row.key,
      label: row.label,
      amount: formatMoneyWhole(row.value, currency),
      ratio: largest > 0 ? row.value / largest : 0,
    }));

    const isEmpty =
      isZero(income) && isZero(expense) && isZero(saving) && isZero(investing) && sorted.length === 0;

    return { leadMetrics, detailMetrics, splitSegments, fromSavings, categoryRows, isEmpty };
    // percentOf only depends on formatNumber.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, data, formatNumber, t]);

  const symbol = formatMoneyParts(0, currency, 0).find((part) => part.type === 'currency')?.value ?? currency;
  const compactNumber = (value: number) => formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 });

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:mb-10">
      <h1 className="text-sm font-semibold lg:sr-only">{t('pages.overview.title')}</h1>
      <PeriodNavigator
        mode="month"
        month={month}
        year={year}
        years={years}
        onChange={setPeriod}
        className="[&>div:first-child]:gap-1 [&>div:first-child]:border-transparent [&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:shadow-none"
      />
      <button
        type="button"
        onClick={openAddTransaction}
        aria-label={t('pages.overview.addTransactionShortcut')}
        className="hidden h-11 items-center gap-2.5 whitespace-nowrap rounded-full bg-primary px-[1.125rem] text-[0.90625rem] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline-flex"
      >
        <Plus className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        {t('pages.overview.addTransaction')}
        <kbd className="rounded-[0.3125rem] border border-primary-foreground/35 px-[0.3125rem] py-px font-sans text-[0.6875rem] font-medium" aria-hidden="true">N</kbd>
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <OverviewSkeleton />
      </div>
    );
  }

  if (error || !data || !view) {
    return (
      <div>
        {header}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.overview.errorTitle')}</p>
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

  if (view.isEmpty) {
    return (
      <div>
        {header}
        <div className="flex min-h-[20rem] flex-col items-center justify-center gap-2 text-center">
          <p className="text-[1.1875rem] font-light">{t('pages.overview.emptyTitle', { month: monthYear })}</p>
          <p className="max-w-[40ch] text-sm text-muted-foreground">{t('pages.overview.emptyDescription')}</p>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setPeriod(now.getMonth() + 1, now.getFullYear())}
            >
              {t('common.thisMonth')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const daily = data.daily_cumulative_expense;
  const averageSeries = data.average_daily_cumulative_expense;
  const averageHasData = averageSeries.some((value) => value > 0);
  const hasSpending = daily.some((value) => value > 0) || averageHasData;
  const comparisonSeries = averageHasData ? averageSeries : [];

  const lastDay = daily.length;
  const chartAria = [
    t('pages.overview.chartAria', { month: monthLong }),
    // Amounts stay out of the accessible name while amounts are hidden.
    !isPrivacyMode && lastDay > 0
      ? averageHasData
        ? t('pages.overview.chartAriaDetailAverage', {
            amount: money(daily[lastDay - 1]),
            day: lastDay,
            average: money(averageSeries[lastDay - 1] ?? 0),
          })
        : t('pages.overview.chartAriaDetail', { amount: money(daily[lastDay - 1]), day: lastDay })
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const accountCurrency = (accountId: string) => accounts.find((account) => account.accounts_id_pk === accountId)?.currency || currency;
  const categoryName = (categoryId: number) =>
    categories.find((category) => category.categories_id_pk === categoryId)?.category_name ?? '';

  return (
    <div>
      {header}

      <section className="items-start gap-x-[4.5rem] lg:grid lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <MetricGrid metrics={view.leadMetrics} size="lg" className="grid-cols-2" formatAmount={money} />
          <MetricGrid
            metrics={view.detailMetrics}
            className="mt-6 grid-cols-2 sm:grid-cols-4 lg:grid-cols-2"
            formatAmount={money}
          />
          <div className="mt-8">
            {view.splitSegments.length > 0 ? (
              <>
                <SplitBar segments={view.splitSegments} />
                {view.fromSavings > 0 && (
                  <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                    <SensitiveValue>
                      {t('pages.overview.includesFromSavings', { amount: money(view.fromSavings) })}
                    </SensitiveValue>
                  </p>
                )}
              </>
            ) : (
              <p className="text-[0.8125rem] text-muted-foreground">{t('pages.overview.noIncome')}</p>
            )}
          </div>
        </div>

        <div className="mt-10 min-w-0 lg:mt-0">
          <h2 className="mb-1.5 text-[0.8125rem] font-normal text-muted-foreground">{t('pages.overview.whereItWent')}</h2>
          {view.categoryRows.length > 0 ? (
            <LineRows rows={view.categoryRows} />
          ) : (
            <p className="py-3 text-sm text-muted-foreground">{t('pages.overview.noExpenses')}</p>
          )}
        </div>
      </section>

      <section className="mt-12 gap-x-[4.5rem] lg:mt-11 lg:grid lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-[0.8125rem] font-normal text-muted-foreground">
              {t('pages.overview.spendingThroughMonth')}, {symbol}
            </h2>
            <ChartLegend
              items={[
                { label: monthLong },
                ...(averageHasData ? [{ label: t('pages.overview.sixMonthAverage'), dashed: true }] : []),
              ]}
            />
          </div>
          {hasSpending ? (
            <SeriesLineChart
              length={daysInMonth}
              primary={daily}
              comparison={comparisonSeries}
              formatAxis={compactNumber}
              formatValue={money}
              xLabel={(index) => String(index + 1)}
              tooltipTitle={(index) => t('pages.overview.chartDay', { day: index + 1 })}
              primaryName={monthLong}
              comparisonName={t('pages.overview.sixMonthAverage')}
              ariaLabel={chartAria}
            />
          ) : (
            <p className="py-12 text-sm text-muted-foreground">{t('pages.overview.noSpendingYet')}</p>
          )}
          <Link
            to={`/dashboard/analytics/monthly?month=${pad(month)}&year=${year}`}
            className="mt-3 inline-block text-[0.8125rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('pages.overview.monthlyAnalytics')}
          </Link>
        </div>

        <div className="mt-10 min-w-0 lg:mt-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h2 className="text-[0.8125rem] font-normal text-muted-foreground">{t('pages.overview.latest')}</h2>
            <Link
              to="/dashboard/transactions"
              className="text-[0.8125rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('pages.overview.viewAll')}
            </Link>
          </div>
          {latest.length > 0 ? (
            <RowList>
              {latest.map((transaction, index) => {
                const category = categoryName(transaction.category_id_fk);
                const date = formatDate(transaction.date, { day: 'numeric', month: 'short' });
                const amount = Number(transaction.amount);
                return (
                  <RowListItem
                    key={transaction.id_pk}
                    className={index >= LATEST_COUNT_COMPACT ? 'max-lg:hidden' : undefined}
                    primary={transaction.notes || category || date}
                    secondary={
                      transaction.notes ? (
                        <>
                          {category && <span className="min-w-0 truncate">{category}</span>}
                          <span className="shrink-0 whitespace-pre">{category ? ' · ' : ''}{date}</span>
                        </>
                      ) : category ? (
                        date
                      ) : undefined
                    }
                    amount={`${amount > 0 ? '+' : ''}${formatMoney(amount, accountCurrency(transaction.account_id_fk))}`}
                    tone={amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'muted'}
                  />
                );
              })}
            </RowList>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">{t('pages.overview.noTransactions')}</p>
          )}
        </div>
      </section>

    </div>
  );
}
