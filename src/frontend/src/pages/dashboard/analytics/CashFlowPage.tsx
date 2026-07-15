import { useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageDown } from 'lucide-react';
import { useUrlState } from '@/hooks/use-url-state';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { SankeyChart, type SankeyChartHandle, type SankeyInput } from '@/components/analytics/SankeyChart';

const toRecord = (rows: { category: string; total: number }[]) =>
  Object.fromEntries(rows.map((x) => [x.category, x.total]));

export default function CashFlowPage() {
  const { t, currency, formatMonth } = useUser();
  const now = useMemo(() => new Date(), []);
  const chartRef = useRef<SankeyChartHandle>(null);
  const [mode, setMode] = useUrlState('mode', 'year');
  const [selectedYear, setSelectedYear] = useUrlState('year', now.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useUrlState('month', (now.getMonth() + 1).toString().padStart(2, '0'));
  const selectedYearNumber = parseInt(selectedYear);
  const selectedMonthNumber = parseInt(selectedMonth);
  const isMonthly = mode === 'month';

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => now.getFullYear() - i + 2), [now]);
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: formatMonth(i, 'long') })),
    [formatMonth]
  );

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

  const periodLabel = isMonthly ? `${months[selectedMonthNumber - 1]?.label} ${selectedYear}` : selectedYear;

  const handleExport = () => {
    const slug = isMonthly ? `${selectedYear}-${selectedMonth}` : selectedYear;
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
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">{t('pages.cashFlow.periodYear')}</SelectItem>
                <SelectItem value="month">{t('pages.cashFlow.periodMonth')}</SelectItem>
              </SelectContent>
            </Select>
            {isMonthly && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('common.month')} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={t('common.year')} />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
