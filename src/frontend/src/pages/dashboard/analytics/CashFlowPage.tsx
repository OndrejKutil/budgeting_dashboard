import { useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, ImageDown } from 'lucide-react';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { useUrlPeriod, useUrlState } from '@/hooks/use-url-state';
import { useAvailableYears } from '@/hooks/use-available-years';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { useUser } from '@/contexts/user-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { SankeyChart, type SankeyChartHandle, type SankeyInput } from '@/components/analytics/SankeyChart';

const toRecord = (rows: { category: string; total: number }[]) => Object.fromEntries(rows.map((x) => [x.category, x.total]));

/** The flow by category plus the period's totals as the backend computes them. */
interface CashFlowData extends SankeyInput {
  totals: { income: number; expenses: number; savings: number; investments: number; profit: number; cashflow: number };
}

/** A value that displays as 0 is 0: no "-0". */
const whole = (value: number) => (Math.abs(value) < 0.5 ? 0 : value);

export default function CashFlowPage() {
  const { t, currency, formatMonth, formatNumber } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const chartRef = useRef<SankeyChartHandle>(null);
  // Explicitly <string>: inferred from the default alone, T narrows to the literal 'year'.
  const [mode, setMode] = useUrlState<string>('mode', 'year');
  const { month: selectedMonthNumber, year: selectedYearNumber, setPeriod } = useUrlPeriod();
  const selectedYear = String(selectedYearNumber);
  const isMonthly = mode === 'month';
  const years = useAvailableYears({ include: selectedYearNumber });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['cashflow', mode, selectedYearNumber, selectedMonthNumber, currency],
    queryFn: async (): Promise<CashFlowData> => {
      if (isMonthly) {
        const response = await analyticsApi.getMonthly({ year: selectedYearNumber, month: selectedMonthNumber, base_currency: currency });
        if (!response.success || !response.data) throw new Error(response.message || t('pages.cashFlow.loadFailed'));
        const d = response.data;
        return {
          income_by_category: toRecord(d.income_breakdown),
          expense_by_category: toRecord(d.expenses_breakdown),
          saving_by_category: toRecord(d.saving_breakdown),
          investment_by_category: toRecord(d.investment_breakdown),
          total_saving: d.savings,
          total_investment: d.investments,
          totals: {
            income: d.income,
            expenses: d.expenses,
            savings: d.savings,
            investments: d.investments,
            profit: d.profit,
            cashflow: d.cashflow,
          },
        };
      }
      const response = await analyticsApi.getYearly({ year: selectedYearNumber, base_currency: currency });
      if (!response.success || !response.data) throw new Error(response.message || t('pages.cashFlow.loadFailed'));
      const d = response.data;
      return {
        income_by_category: d.income_by_category,
        expense_by_category: d.expense_by_category,
        saving_by_category: d.saving_by_category,
        investment_by_category: d.investment_by_category,
        total_saving: d.total_saving,
        total_investment: d.total_investment,
        totals: {
          income: d.total_income,
          expenses: d.total_expense,
          savings: d.total_saving,
          investments: d.total_investment,
          profit: d.profit,
          cashflow: d.net_cash_flow,
        },
      };
    },
    placeholderData: keepPreviousData,
  });

  const periodLabel = isMonthly ? `${formatMonth(selectedMonthNumber - 1, 'long')} ${selectedYear}` : selectedYear;
  const hasData = !!data && (Object.keys(data.income_by_category).length > 0 || Object.keys(data.expense_by_category).length > 0);

  const handleExport = () => {
    const slug = isMonthly ? `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}` : selectedYear;
    chartRef.current?.exportPng(`cashflow-${slug}.png`);
  };

  const header = (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:mb-10">
      <h1 className="min-w-0 text-[1.5rem] font-medium tracking-tight text-foreground sm:text-[1.625rem]">
        {periodLabel}
        <span className="ml-3 whitespace-nowrap text-[1rem] font-normal text-muted-foreground">{t('pages.cashFlow.title')}</span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div role="group" aria-label={t('pages.cashFlow.periodType')} className="flex gap-4 text-[0.9375rem]">
          {(['year', 'month'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              className={cn(
                'rounded-sm py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                mode === option ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('border-b-2 pb-[0.1875rem]', mode === option ? 'border-primary' : 'border-transparent')}>
                {t(option === 'year' ? 'pages.cashFlow.periodYear' : 'pages.cashFlow.periodMonth')}
              </span>
            </button>
          ))}
        </div>
        <PeriodNavigator
          mode={isMonthly ? 'month' : 'year'}
          month={selectedMonthNumber}
          year={selectedYearNumber}
          years={years}
          onChange={setPeriod}
          className="[&>div:first-child]:gap-1 [&>div:first-child]:border-transparent [&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:shadow-none"
        />
        <Button variant="outline" className="hidden h-11 px-4 md:inline-flex" onClick={handleExport} disabled={!hasData}>
          <ImageDown aria-hidden="true" />
          {t('pages.cashFlow.exportPng')}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        {header}
        <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('pages.cashFlow.loadFailed')}</p>
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

  const money = (value: number) => formatMoneyWhole(value, currency);
  const parts = (value: number) => formatMoneyParts(whole(value), currency, 0);
  const { totals } = data;
  const metrics: Metric[] = [
    { key: 'income', label: t('metrics.income'), value: whole(totals.income), parts: parts(totals.income), note: null },
    { key: 'expenses', label: t('metrics.expenses'), value: whole(totals.expenses), parts: parts(totals.expenses), note: null },
    { key: 'saved', label: t('metrics.saved'), value: whole(totals.savings), parts: parts(totals.savings), note: null },
    { key: 'invested', label: t('metrics.invested'), value: whole(totals.investments), parts: parts(totals.investments), note: null },
    { key: 'profit', label: t('metrics.profit'), value: whole(totals.profit), parts: parts(totals.profit), note: null },
    { key: 'cashflow', label: t('metrics.cashFlow'), value: whole(totals.cashflow), parts: parts(totals.cashflow), accent: true, note: null },
  ];

  // Phones get the same flow as ranked rows: a Sankey cannot be read at that width.
  const rowsFor = (record: Record<string, number>): LineRow[] => {
    const entries = Object.entries(record)
      .map(([name, value]) => [name, Number(value)] as const)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
    const largest = entries[0]?.[1] ?? 0;
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    return entries.map(([name, value]) => ({
      key: name,
      label: name,
      detail: total > 0 ? formatNumber(value / total, { style: 'percent', maximumFractionDigits: 0 }) : undefined,
      amount: money(value),
      ratio: largest > 0 ? value / largest : 0,
    }));
  };
  const flowGroups = [
    { key: 'income', title: t('metrics.income'), rows: rowsFor(data.income_by_category), bar: 'bg-success' },
    { key: 'expenses', title: t('metrics.expenses'), rows: rowsFor(data.expense_by_category), bar: 'bg-foreground/50' },
    { key: 'savings', title: t('metrics.savings'), rows: rowsFor(data.saving_by_category), bar: 'bg-foreground/35' },
    { key: 'investments', title: t('metrics.investments'), rows: rowsFor(data.investment_by_category), bar: 'bg-foreground/35' },
  ].filter((group) => group.rows.length > 0);

  const chartAria = isPrivacyMode
    ? t('pages.cashFlow.chartAria', { period: periodLabel })
    : t('pages.cashFlow.chartAriaDetail', { period: periodLabel, amount: money(totals.cashflow) });

  return (
    <div>
      {header}

      <section aria-label={t('pages.cashFlow.title')} className={cn('transition-opacity', isFetching && 'opacity-60')}>
        <MetricGrid metrics={metrics} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" formatAmount={money} />
      </section>

      {hasData ? (
        <>
          <section aria-labelledby="cashflow-flow" className="mt-12 hidden md:block">
            <h2 id="cashflow-flow" className="mb-3 text-[0.8125rem] font-normal text-muted-foreground">
              {t('pages.cashFlow.flowHeading')}
            </h2>
            <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
              <SankeyChart ref={chartRef} data={data} ariaLabel={chartAria} />
            </div>
          </section>

          <div className="mt-10 space-y-10 md:hidden">
            {flowGroups.map((group) => (
              <section key={group.key} aria-labelledby={`cashflow-${group.key}`}>
                <h2 id={`cashflow-${group.key}`} className="mb-1.5 text-[0.8125rem] font-normal text-muted-foreground">
                  {group.title}
                </h2>
                <LineRows rows={group.rows} barClassName={group.bar} />
              </section>
            ))}
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">{t('pages.cashFlow.noData')}</p>
      )}
    </div>
  );
}
