import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OverviewSkeleton } from '@/components/skeletons';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { BigFigure } from '@/components/data/BigFigure';
import { LeadFigure, LeadSentence, type LeadSegment } from '@/components/data/LeadSentence';
import { SplitBar, type SplitSegment } from '@/components/data/SplitBar';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { RowList, RowListItem } from '@/components/data/RowList';
import { ChartLegend } from '@/components/data/ChartLegend';
import { SeriesLineChart } from '@/components/data/SeriesLineChart';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
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
    // Reused as the API defines them: profit = income - expenses - investing,
    // net cash flow ("left") = profit - saving.
    const profit = whole(data.profit);
    const left = whole(data.net_cash_flow);

    const figure = (value: number, tone?: 'negative') => (
      <LeadFigure tone={tone}>{formatMoneyWhole(value, currency)}</LeadFigure>
    );
    const shortfall = left < 0 ? figure(Math.abs(left), 'negative') : null;

    const segments: LeadSegment[] = [
      {
        template: t('pages.overview.leadEarnedSpent'),
        values: { income: figure(income), expense: figure(expense) },
      },
    ];

    if (!isZero(investing)) {
      segments.push(
        profit >= 0
          ? {
              template: t('pages.overview.leadProfitAfterInvesting'),
              values: { investing: figure(investing), profit: figure(profit) },
            }
          : {
              template: t('pages.overview.leadLossAfterInvesting'),
              values: { investing: figure(investing), loss: figure(Math.abs(profit), 'negative') },
            },
      );
    } else {
      segments.push(
        profit >= 0
          ? { template: t('pages.overview.leadProfit'), values: { profit: figure(profit) } }
          : { template: t('pages.overview.leadLoss'), values: { loss: figure(Math.abs(profit), 'negative') } },
      );
    }

    const leftValue = figure(Math.max(left, 0));
    if (isZero(saving)) {
      segments.push(
        left >= 0
          ? { template: t('pages.overview.leadNothingSavedLeft'), values: { left: leftValue } }
          : { template: t('pages.overview.leadNothingSavedShort'), values: { shortfall } },
      );
    } else if (saving > 0) {
      segments.push(
        left >= 0
          ? { template: t('pages.overview.leadSavedLeft'), values: { saving: figure(saving), left: leftValue } }
          : { template: t('pages.overview.leadSavedShort'), values: { saving: figure(saving), shortfall } },
      );
    } else {
      segments.push(
        left >= 0
          ? { template: t('pages.overview.leadWithdrawnLeft'), values: { saving: figure(Math.abs(saving)), left: leftValue } }
          : { template: t('pages.overview.leadWithdrawnShort'), values: { saving: figure(Math.abs(saving)), shortfall } },
      );
    }

    const splitSegments: SplitSegment[] =
      income > 0
        ? [
            { key: 'spent', label: t('pages.overview.spent'), value: expense, percent: percentOf(expense, income), tone: 'strong' },
            { key: 'saved', label: t('pages.overview.saved'), value: saving, percent: percentOf(saving, income), tone: 'soft' },
            { key: 'invested', label: t('pages.overview.invested'), value: investing, percent: percentOf(investing, income), tone: 'medium' },
            { key: 'left', label: t('pages.overview.left'), value: left, percent: percentOf(left, income), tone: 'accent' },
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

    const average = data.six_month_average;
    const leftVsAverage = average ? whole(left - average.net_cash_flow) : 0;

    const isEmpty =
      isZero(income) && isZero(expense) && isZero(saving) && isZero(investing) && sorted.length === 0;

    return { left, segments, splitSegments, categoryRows, leftVsAverage, hasAverage: average !== null, isEmpty };
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
        className="hidden h-11 items-center gap-2.5 whitespace-nowrap rounded-full bg-primary px-[18px] text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline-flex"
      >
        <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
        {t('pages.overview.addTransaction')}
        <kbd className="rounded-[5px] border border-primary-foreground/35 px-[5px] py-px font-sans text-[11px] font-medium" aria-hidden="true">N</kbd>
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
        <div role="alert" className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
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
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-[19px] font-light">{t('pages.overview.emptyTitle', { month: monthYear })}</p>
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

  const averageDiff = view.hasAverage && !isZero(view.leftVsAverage) ? view.leftVsAverage : null;

  return (
    <div>
      {header}

      <section className="items-end gap-x-[72px] lg:grid lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <BigFigure
            label={isCurrentMonth ? t('pages.overview.leftThisMonth') : t('pages.overview.leftIn', { month: monthYear })}
            parts={formatMoneyParts(view.left, currency, 0)}
            negative={view.left < 0}
          />
          <LeadSentence segments={view.segments} />
          {averageDiff !== null && (
            <p className={`mt-2 text-[13px] ${averageDiff > 0 ? 'text-success' : 'text-destructive'}`}>
              <SensitiveValue>
                {t(averageDiff > 0 ? 'pages.overview.aboveAverage' : 'pages.overview.belowAverage', {
                  amount: money(Math.abs(averageDiff)),
                })}
              </SensitiveValue>
            </p>
          )}
          <div className="mt-7">
            {view.splitSegments.length > 0 ? (
              <SplitBar segments={view.splitSegments} />
            ) : (
              <p className="text-[13px] text-muted-foreground">{t('pages.overview.noIncome')}</p>
            )}
          </div>
        </div>

        <div className="mt-10 min-w-0 lg:mt-0">
          <h2 className="mb-1.5 text-[13px] font-normal text-muted-foreground">{t('pages.overview.whereItWent')}</h2>
          {view.categoryRows.length > 0 ? (
            <LineRows rows={view.categoryRows} />
          ) : (
            <p className="py-3 text-sm text-muted-foreground">{t('pages.overview.noExpenses')}</p>
          )}
        </div>
      </section>

      <section className="mt-12 gap-x-[72px] lg:mt-11 lg:grid lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-[13px] font-normal text-muted-foreground">
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
            className="mt-3 inline-block text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('pages.overview.monthlyAnalytics')}
          </Link>
        </div>

        <div className="mt-10 min-w-0 lg:mt-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-normal text-muted-foreground">{t('pages.overview.latest')}</h2>
            <Link
              to="/dashboard/transactions"
              className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    secondary={transaction.notes ? [category, date].filter(Boolean).join(' · ') : category ? date : undefined}
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
