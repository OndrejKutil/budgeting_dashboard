import { useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageDown } from 'lucide-react';
import { useUrlPeriod, useUrlState } from '@/hooks/use-url-state';
import { useAvailableYears } from '@/hooks/use-available-years';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { SankeyChart, type SankeyChartHandle, type SankeyInput } from '@/components/analytics/SankeyChart';

const toRecord = (rows: { category: string; total: number }[]) =>
  Object.fromEntries(rows.map((x) => [x.category, x.total]));

export default function CashFlowPage() {
  const { t, currency, formatMonth } = useUser();
  const chartRef = useRef<SankeyChartHandle>(null);
  // Explicitly <string>: inferred from the default alone, T narrows to the literal 'year',
  // which makes the `=== 'month'` below look impossible and rejects setMode from the Select.
  const [mode, setMode] = useUrlState<string>('mode', 'year');
  const { month: selectedMonthNumber, year: selectedYearNumber, setPeriod } = useUrlPeriod();
  const selectedYear = String(selectedYearNumber);
  const isMonthly = mode === 'month';
  const years = useAvailableYears();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cashflow', mode, selectedYearNumber, selectedMonthNumber, currency],
    queryFn: async (): Promise<SankeyInput> => {
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
      };
    },
    placeholderData: keepPreviousData,
  });

  const periodLabel = isMonthly ? `${formatMonth(selectedMonthNumber - 1, 'long')} ${selectedYear}` : selectedYear;

  const handleExport = () => {
    const slug = isMonthly ? `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}` : selectedYear;
    chartRef.current?.exportPng(`cashflow-${slug}.png`);
  };

  if (isLoading) return <AnalyticsSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error instanceof Error ? error.message : t('pages.cashFlow.loadFailed')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>{t('common.retry')}</Button>
      </div>
    );
  }

  const hasData = Object.keys(data.income_by_category).length > 0 || Object.keys(data.expense_by_category).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.cashFlow.title')}
        description={t('pages.cashFlow.description', { period: periodLabel })}
        actions={
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!hasData}>
              <ImageDown className="h-4 w-4 mr-2" />
              {t('pages.cashFlow.exportPng')}
            </Button>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-[110px]" aria-label={t('pages.cashFlow.periodType')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">{t('pages.cashFlow.periodYear')}</SelectItem>
                <SelectItem value="month">{t('pages.cashFlow.periodMonth')}</SelectItem>
              </SelectContent>
            </Select>
            <PeriodNavigator
              mode={isMonthly ? 'month' : 'year'}
              month={selectedMonthNumber}
              year={selectedYearNumber}
              years={years}
              onChange={setPeriod}
            />
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {hasData ? (
          <SankeyChart ref={chartRef} data={data} height={560} />
        ) : (
          <div className="flex h-96 items-center justify-center text-muted-foreground text-sm">
            {t('pages.cashFlow.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
