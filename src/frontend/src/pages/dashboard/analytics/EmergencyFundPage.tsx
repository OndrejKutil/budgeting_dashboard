import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { MetricGrid, type Metric } from '@/components/data/MetricGrid';
import { LineRows, type LineRow } from '@/components/data/LineRows';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUrlState } from '@/hooks/use-url-state';
import { useAvailableYears } from '@/hooks/use-available-years';
import { useUser } from '@/contexts/user-context';
import { analyticsApi } from '@/lib/api/endpoints';
import type { EmergencyFundData } from '@/lib/api/types';
import { formatMoneyParts, formatMoneyWhole } from '@/lib/currency';
import type { DashboardTranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Scenario = 'core' | 'necessary' | 'all';
const SCENARIOS: Scenario[] = ['core', 'necessary', 'all'];

const SCENARIO_TAB: Record<Scenario, DashboardTranslationKey> = {
  core: 'pages.emergencyFund.coreOnly',
  necessary: 'pages.emergencyFund.coreNecessary',
  all: 'pages.emergencyFund.allExpenses',
};
const SCENARIO_DESCRIPTION: Record<Scenario, DashboardTranslationKey> = {
  core: 'pages.emergencyFund.coreScenarioDescription',
  necessary: 'pages.emergencyFund.necessaryScenarioDescription',
  all: 'pages.emergencyFund.allScenarioDescription',
};

/** The figures of one scenario, picked out of the response. */
function scenarioFigures(data: EmergencyFundData, scenario: Scenario) {
  if (scenario === 'core') {
    return {
      monthly: data.average_monthly_core_expenses,
      annual: data.total_core_expenses,
      targets: [
        { months: 3, amount: data.three_month_core_target },
        { months: 6, amount: data.six_month_core_target },
      ],
    };
  }
  if (scenario === 'necessary') {
    return {
      monthly: data.average_monthly_core_necessary,
      annual: data.total_core_necessary,
      targets: [
        { months: 3, amount: data.three_month_core_necessary_target },
        { months: 6, amount: data.six_month_core_necessary_target },
      ],
    };
  }
  return {
    monthly: data.average_monthly_all_expenses,
    annual: data.total_all_expenses,
    targets: [
      { months: 3, amount: data.three_month_all_target },
      { months: 6, amount: data.six_month_all_target },
    ],
  };
}

export default function EmergencyFundPage() {
  const { t, locale, currency, formatNumber } = useUser();
  const [selectedYear, setSelectedYear] = useUrlState('year', new Date().getFullYear().toString());
  const [scenarioParam, setScenario] = useUrlState('scenario', 'core' as string);
  const scenario: Scenario = SCENARIOS.includes(scenarioParam as Scenario) ? (scenarioParam as Scenario) : 'core';
  const year = parseInt(selectedYear);
  const years = useAvailableYears({ include: year });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['emergency-fund', year, currency],
    queryFn: async () => {
      const response = await analyticsApi.getEmergencyFund({ year, base_currency: currency });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || t('pages.emergencyFund.loadFailed'));
    },
    placeholderData: keepPreviousData,
  });

  const money = (value: number) => formatMoneyWhole(value, currency);

  const header = (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:mb-10">
      <div className="min-w-0">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
          {t('pages.emergencyFund.title')}
        </h1>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">{t('pages.emergencyFund.trackingHint')}</p>
      </div>
      <PeriodNavigator
        mode="year"
        year={year}
        years={years}
        onChange={(_, y) => setSelectedYear(String(y))}
        className="[&>div:first-child]:gap-1 [&>div:first-child]:border-transparent [&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:shadow-none"
      />
    </header>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <div className="space-y-10" aria-busy="true">
          <Skeleton className="h-6 w-80 max-w-full" />
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <div className="space-y-4">
            {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        </div>
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
            <p className="font-medium">{t('pages.emergencyFund.loadFailed')}</p>
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

  const { monthly, annual, targets } = scenarioFigures(data, scenario);
  const balance = data.current_savings_amount;
  const hasSpending = monthly > 0.5;
  const runway = hasSpending ? balance / monthly : null;

  // "4.8 months" with the unit set small and muted, like a currency symbol.
  const runwayRounded = runway === null ? 0 : Math.floor(runway * 10) / 10;
  const unitCategory = new Intl.PluralRules(locale).select(runwayRounded);
  const unitKey: DashboardTranslationKey =
    unitCategory === 'one'
      ? 'pages.emergencyFund.monthsOne'
      : unitCategory === 'few'
        ? 'pages.emergencyFund.monthsFew'
        : unitCategory === 'many'
          ? 'pages.emergencyFund.monthsMany'
          : 'pages.emergencyFund.monthsOther';
  const runwayParts: Intl.NumberFormatPart[] =
    runway === null
      ? [{ type: 'literal', value: '—' }]
      : [
          ...new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).formatToParts(runwayRounded),
          { type: 'literal', value: ' ' },
          // Marked as a currency part only so FigureParts sets the unit small and muted.
          { type: 'currency', value: t(unitKey) },
        ];

  const metrics: Metric[] = [
    {
      key: 'runway',
      label: t('pages.emergencyFund.runway'),
      value: runwayRounded,
      parts: runwayParts,
      accent: true,
      note: hasSpending ? t('pages.emergencyFund.runwayHint') : t('pages.emergencyFund.noSpending'),
    },
    {
      key: 'balance',
      label: t('pages.emergencyFund.fundBalance'),
      value: balance,
      parts: formatMoneyParts(balance, currency, 0),
      note: balance > 0.5 ? t('pages.emergencyFund.balanceHint') : t('pages.emergencyFund.noFund'),
    },
    {
      key: 'monthly',
      label: t('pages.emergencyFund.monthlySpending'),
      value: monthly,
      parts: formatMoneyParts(monthly, currency, 0),
      note: (
        <SensitiveValue>
          {t('pages.emergencyFund.annualNote', {
            amount: money(annual),
            months: formatNumber(data.months_analyzed),
          })}
        </SensitiveValue>
      ),
    },
  ];

  const breakdown = Object.entries(data.core_category_breakdown ?? {})
    .map(([name, amount]) => ({ name, amount: Number(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const largest = Math.max(...breakdown.map((item) => item.amount), 0);
  const breakdownRows: LineRow[] = breakdown.map((item) => ({
    key: item.name,
    label: item.name,
    amount: money(item.amount),
    ratio: largest > 0 ? item.amount / largest : 0,
  }));

  const headingClass = 'text-[1.125rem] font-medium tracking-[-0.01em]';

  return (
    <div>
      {header}

      {/* Scenario: how much spending the fund has to cover. */}
      <div role="group" aria-label={t('pages.emergencyFund.scenario')} className="flex flex-wrap gap-x-6 gap-y-1 text-[0.9375rem]">
        {SCENARIOS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={scenario === option}
            onClick={() => setScenario(option)}
            className={cn(
              'rounded-sm py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              scenario === option ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className={cn('border-b-2 pb-[0.1875rem]', scenario === option ? 'border-primary' : 'border-transparent')}>
              {t(SCENARIO_TAB[option])}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[0.8125rem] text-muted-foreground">{t(SCENARIO_DESCRIPTION[scenario])}</p>

      <section aria-label={t('pages.emergencyFund.title')} className={cn('mt-8 transition-opacity', isFetching && 'opacity-60')}>
        <MetricGrid metrics={metrics} size="lg" className="grid-cols-2 lg:grid-cols-3" formatAmount={money} />
      </section>

      <section aria-labelledby="emergency-targets" className="mt-12 lg:mt-14">
        <div className="border-b border-foreground/30 pb-3">
          <h2 id="emergency-targets" className={headingClass}>{t('pages.emergencyFund.targets')}</h2>
        </div>
        <ul>
          {targets.map((target) => {
            const ratio = target.amount > 0 ? balance / target.amount : 0;
            const reached = target.amount > 0 && ratio >= 1;
            const shown = formatNumber(Math.min(Math.max(ratio, 0), 1), { style: 'percent', maximumFractionDigits: 0 });
            return (
              <li key={target.months} className="border-b border-border py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
                  <div className="min-w-0">
                    <div className="text-base">{t('pages.emergencyFund.monthsOfSpending', { count: target.months })}</div>
                    <div className={cn('text-[0.8125rem]', reached ? 'text-success' : 'text-muted-foreground')}>
                      {reached ? (
                        t('pages.emergencyFund.reached')
                      ) : (
                        <SensitiveValue>
                          {t('pages.emergencyFund.toReachBuffer', { amount: money(Math.max(target.amount - balance, 0)) })}
                        </SensitiveValue>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="whitespace-nowrap text-[1.0625rem] tabular-nums">
                      <SensitiveValue>{money(target.amount)}</SensitiveValue>
                    </div>
                    <div className="text-[0.8125rem] tabular-nums text-muted-foreground">
                      <SensitiveValue>{shown}</SensitiveValue>
                    </div>
                  </div>
                </div>
                <div aria-hidden="true" className="mt-3 h-[2px] rounded-full bg-foreground/10">
                  <div
                    className={cn('h-full rounded-full', reached ? 'bg-success' : 'bg-foreground/60')}
                    style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {scenario === 'core' && (
        <section aria-labelledby="emergency-core" className="mt-12 lg:mt-14">
          <div className="border-b border-foreground/30 pb-3">
            <h2 id="emergency-core" className={headingClass}>{t('pages.emergencyFund.coreBreakdownTitle')}</h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{t('pages.emergencyFund.coreBreakdownDescription')}</p>
          </div>
          {breakdownRows.length > 0 ? (
            <LineRows rows={breakdownRows} className="mt-1 max-w-3xl" barClassName="bg-foreground/50" />
          ) : (
            <p className="py-4 text-sm text-muted-foreground">{t('pages.emergencyFund.noCoreData')}</p>
          )}
        </section>
      )}
    </div>
  );
}
