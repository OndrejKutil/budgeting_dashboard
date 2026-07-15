import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, TrendingUp } from 'lucide-react';
import { useUrlState } from '@/hooks/use-url-state';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

const DEFAULT_RETURN = 7;
const DEFAULT_WITHDRAWAL = 4;

function yearsToTarget(nw: number, target: number, annualSavings: number, rate: number): number | null {
  if (nw >= target) return 0;
  if (annualSavings <= 0 && rate <= 0) return null;
  let balance = nw;
  for (let y = 1; y <= 100; y++) {
    balance = balance * (1 + rate) + annualSavings;
    if (balance >= target) return y;
  }
  return null;
}

function coastYears(nw: number, target: number, rate: number): number | null {
  if (nw <= 0 || rate <= 0) return null;
  if (nw >= target) return 0;
  return Math.round(Math.log(target / nw) / Math.log(1 + rate));
}

export default function FIREPage() {
  const { formatCurrency, t, currency } = useUser();
  const [selectedYear, setSelectedYear] = useUrlState('year', new Date().getFullYear().toString());
  const selectedYearNumber = parseInt(selectedYear);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - i + 2), [currentYear]);

  // Assumptions — user-adjustable, session-only (not persisted).
  const [returnInput, setReturnInput] = useState(DEFAULT_RETURN.toString());
  const [withdrawalInput, setWithdrawalInput] = useState(DEFAULT_WITHDRAWAL.toString());
  const returnRate = Math.max(0, parseFloat(returnInput) || 0) / 100;
  const withdrawalRate = Math.max(0.1, parseFloat(withdrawalInput) || DEFAULT_WITHDRAWAL) / 100;

  const { data, isLoading, error } = useQuery({
    queryKey: ['fire', selectedYearNumber, currency],
    queryFn: async () => {
      const response = await analyticsApi.getFIRE({ year: selectedYearNumber, base_currency: currency });
      if (response.success && response.data) return response.data;
      throw new Error(response.message || t('pages.fire.loadFailed'));
    },
    placeholderData: keepPreviousData,
  });

  const computed = useMemo(() => {
    if (!data) return null;
    const multiplier = 1 / withdrawalRate;
    const nw = data.current_net_worth;
    const build = (monthly: number) => {
      const fiNumber = monthly * 12 * multiplier;
      return {
        fiNumber,
        progress: fiNumber > 0 ? Math.min(100, (nw / fiNumber) * 100) : 0,
        monthly,
      };
    };
    const standard = build(data.monthly_core_necessary_expenses);
    const yrs = yearsToTarget(nw, standard.fiNumber, data.annual_savings, returnRate);
    return {
      lean: build(data.monthly_core_expenses),
      standard,
      fat: build(data.monthly_all_expenses),
      yearsToFI: yrs,
      projectedYear: yrs !== null ? currentYear + yrs : null,
      coast: coastYears(nw, standard.fiNumber, returnRate),
    };
  }, [data, withdrawalRate, returnRate, currentYear]);

  if (isLoading) return <AnalyticsSkeleton />;

  if (error || !data || !computed) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error instanceof Error ? error.message : t('pages.fire.loadFailed')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>{t('common.retry')}</Button>
      </div>
    );
  }

  const fmtYears = (y: number | null) => (y === null ? '—' : y === 0 ? '✓' : `${y}y`);

  const variants = [
    { key: 'lean', label: t('pages.fire.leanFI'), description: t('pages.fire.leanFIDescription'), color: 'text-chart-income', ...computed.lean },
    { key: 'standard', label: t('pages.fire.standardFI'), description: t('pages.fire.standardFIDescription'), color: 'text-chart-savings', ...computed.standard },
    { key: 'fat', label: t('pages.fire.fatFI'), description: t('pages.fire.fatFIDescription'), color: 'text-chart-investment', ...computed.fat },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pages.fire.title')}
        description={t('pages.fire.description', { year: selectedYear })}
        actions={
          <div className="flex gap-2 no-print">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
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

      {/* Unified summary header: current position (left) + projections toward Standard FI (right) */}
      <div className="flex flex-col xl:flex-row items-stretch justify-between gap-6 p-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex-1 grid grid-cols-2 gap-4 xl:border-r xl:border-border/50 xl:pr-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-chart-income" /> {t('pages.fire.currentNetWorth')}
            </p>
            <p className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <SensitiveValue>{formatCurrency(data.current_net_worth)}</SensitiveValue>
            </p>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              <SensitiveValue>{formatCurrency(data.annual_income)}</SensitiveValue>/yr income
            </span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
              <Flame className="h-3 w-3 text-chart-savings" /> {t('pages.fire.savingsRate')}
            </p>
            <p className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <SensitiveValue>{data.savings_rate.toFixed(1)}%</SensitiveValue>
            </p>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              <SensitiveValue>{formatCurrency(data.annual_savings)}</SensitiveValue>/yr saved
            </span>
          </div>
        </div>

        {/* Projections (based on Standard FI) */}
        <div className="flex-1 grid grid-cols-3 gap-4 xl:pl-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">{t('pages.fire.yearsToFI')}</p>
            <p className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <SensitiveValue>{fmtYears(computed.yearsToFI)}</SensitiveValue>
            </p>
            {computed.yearsToFI === null && (
              <span className="text-[9px] text-muted-foreground/70 mt-0.5 block leading-tight">{t('pages.fire.noProjection')}</span>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">{t('pages.fire.projectedYear')}</p>
            <p className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <SensitiveValue>{computed.projectedYear ?? '—'}</SensitiveValue>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Coast FI</p>
            <p className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <SensitiveValue>{fmtYears(computed.coast)}</SensitiveValue>
            </p>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border/50 bg-muted/20 px-5 py-4 no-print">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('pages.fire.assumptions')}</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t('pages.fire.expectedReturn')}
          <div className="relative">
            <Input
              type="number" min={0} max={20} step={0.5}
              value={returnInput}
              onChange={(e) => setReturnInput(e.target.value)}
              className="h-8 w-20 pr-6 text-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t('pages.fire.withdrawalRate')}
          <div className="relative">
            <Input
              type="number" min={1} max={10} step={0.1}
              value={withdrawalInput}
              onChange={(e) => setWithdrawalInput(e.target.value)}
              className="h-8 w-20 pr-6 text-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </label>
        <span className="text-[10px] text-muted-foreground/60">{t('pages.fire.multiplierNote', { mult: (1 / withdrawalRate).toFixed(1) })}</span>
      </div>

      {/* FI Variants — single card, three columns (Standard appears once, here) */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">{t('pages.fire.fiNumbers')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-border/50">
          {variants.map((v, idx) => (
            <div
              key={v.key}
              className={`space-y-2.5 ${idx > 0 ? 'md:pl-6' : ''} ${idx < variants.length - 1 ? 'md:pr-6' : ''} ${idx > 0 ? 'border-t border-border/40 pt-6 md:border-t-0 md:pt-0' : ''}`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`text-sm font-semibold ${v.color}`}>{v.label}</span>
                <span className={`text-xs font-bold ${v.color}`}>
                  <SensitiveValue>{v.progress.toFixed(0)}%</SensitiveValue>
                </span>
              </div>
              <p className="text-2xl font-display font-bold tracking-tight">
                <SensitiveValue>{formatCurrency(v.fiNumber)}</SensitiveValue>
              </p>
              <Progress value={v.progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">
                <SensitiveValue>{formatCurrency(v.monthly)}</SensitiveValue>/mo · {v.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
