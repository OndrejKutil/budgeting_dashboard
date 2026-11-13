import { useMemo } from "react"
import { RotateCcw } from "lucide-react"
import { useSearchParams, useLocation } from "react-router-dom"
import { useUrlState } from "@/hooks/use-url-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MetricGrid, type Metric } from "@/components/data/MetricGrid"
import { SeriesLineChart } from "@/components/data/SeriesLineChart"
import { formatMoneyParts, formatMoneyWhole } from "@/lib/currency"
import { useUser } from '@/contexts/user-context'

// --- Constants & Types ---

const FREQUENCIES = {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    YEARLY: "yearly",
} as const

type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES]

// Map frequencies to number of periods per year
const PERIODS_PER_YEAR: Record<Frequency, number> = {
    [FREQUENCIES.DAILY]: 365,
    [FREQUENCIES.WEEKLY]: 52,
    [FREQUENCIES.MONTHLY]: 12,
    [FREQUENCIES.QUARTERLY]: 4,
    [FREQUENCIES.YEARLY]: 1,
}

export default function InvestingCalculator() {

    // --- State & Form ---
    const { t, currency, formatNumber, formatCurrencyCompact } = useUser()
    // URL State management
    const [startingAmount, setStartingAmount] = useUrlState<number>('start', 10000)
    const [addedAmount, setAddedAmount] = useUrlState<number>('added', 500)
    const [frequency, setFrequency] = useUrlState<Frequency>('freq', FREQUENCIES.MONTHLY)
    const [interestRate, setInterestRate] = useUrlState<number>('rate', 7)
    const [years, setYears] = useUrlState<number>('years', 10)
    const [inflation, setInflation] = useUrlState<number>('inflation', 0)

    const [searchParams, setSearchParams] = useSearchParams()
    const location = useLocation()

    const handleReset = () => {
        const newParams = new URLSearchParams(searchParams)
        const keys = ['start', 'added', 'freq', 'rate', 'years', 'inflation']

        keys.forEach(key => {
            newParams.delete(key)
            const storageKey = `budget-dashboard:${location.pathname}:${key}`
            sessionStorage.removeItem(storageKey)
        })

        setSearchParams(newParams)
    }

    // --- Calculation Logic ---

    const results = useMemo(() => {
        // Cast values to Number to ensure they are treated as numbers, not strings.
        // This prevents string concatenation bugs when inputs are being typed.
        // Cast values to Number to ensure they are treated as numbers
        const pStartingAmount = Number(startingAmount)
        const pAddedAmount = Number(addedAmount)
        const pInterestRate = Number(interestRate)
        const pYears = Number(years)
        const pInflation = Number(inflation)
        const pFrequency = frequency

        // 1. Determine the effective annual interest rate.
        //    If inflation is > 0, we subtract it from the nominal interest rate to get the "real" return.
        //    This helps users see the purchasing power of their money in the future.
        const nominalRate = pInterestRate / 100
        const inflationRate = pInflation / 100
        const effectiveRate = nominalRate - inflationRate

        const periodsPerYear = PERIODS_PER_YEAR[pFrequency as Frequency]

        // Calculate rate per period (e.g., monthly rate)
        // If effective rate is negative (inflation > interest), we still calculate mathematically
        const ratePerPeriod = effectiveRate / periodsPerYear

        const dataPoints = []

        let currentBalance = pStartingAmount
        let totalInvested = pStartingAmount

        // Add initial point (Year 0)
        dataPoints.push({
            year: 0,
            invested: Math.round(pStartingAmount),
            balance: Math.round(pStartingAmount),
        })

        for (let year = 1; year <= pYears; year++) {
            // Simulate the compounding for all periods in this year
            for (let p = 0; p < periodsPerYear; p++) {
                // 1. Add contribution
                currentBalance += pAddedAmount
                totalInvested += pAddedAmount

                // 2. Apply interest for this period
                // Formula: Balance = Balance * (1 + ratePerPeriod)
                currentBalance = currentBalance * (1 + ratePerPeriod)
            }

            dataPoints.push({
                year: year,
                invested: Math.round(totalInvested),
                balance: Math.round(currentBalance),
            })
        }

        return { data: dataPoints, finalBalance: currentBalance, totalInvested }
    }, [startingAmount, addedAmount, frequency, interestRate, years, inflation])

    // --- Render ---

    const money = (value: number) => formatMoneyWhole(value, currency)
    const growth = results.finalBalance - results.totalInvested
    const metrics: Metric[] = [
        {
            key: "balance",
            label: t('pages.investingCalculator.futureBalance'),
            value: results.finalBalance,
            parts: formatMoneyParts(results.finalBalance, currency, 0),
            accent: true,
            note: `${t('pages.investingCalculator.afterYears', { years })}${Number(inflation) > 0 ? ` (${t('pages.investingCalculator.adjustingForInflation', { inflation })})` : ""}`,
        },
        {
            key: "invested",
            label: t('pages.investingCalculator.totalContributed'),
            value: results.totalInvested,
            parts: formatMoneyParts(results.totalInvested, currency, 0),
            note: t('pages.investingCalculator.principalPlus', { years }),
        },
        {
            key: "growth",
            label: t('pages.investingCalculator.growth'),
            value: growth,
            parts: formatMoneyParts(growth, currency, 0),
            signed: true,
            note: t('pages.investingCalculator.growthHint'),
        },
    ]

    const numberField = (id: string, label: string, value: number, onChange: (value: number) => void, step?: string) => (
        <Field htmlFor={id} label={label}>
            <Input
                id={id}
                type="number"
                inputMode="decimal"
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="tabular-nums"
            />
        </Field>
    )

    const yearLabel = (index: number) => t('pages.investingCalculator.yearLabel', { year: results.data[index]?.year ?? index })

    return (
        <div>
            <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
                {t('pages.investingCalculator.title')}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">{t('pages.investingCalculator.parametersDescription')}</p>

            <div className="mt-8 grid gap-x-14 gap-y-10 lg:mt-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
                <section aria-label={t('pages.investingCalculator.parameters')} className="space-y-5">
                    {numberField("calc-start", t('pages.investingCalculator.startingAmount'), startingAmount, setStartingAmount)}
                    <div className="grid grid-cols-2 gap-5">
                        {numberField("calc-added", t('pages.investingCalculator.contribution'), addedAmount, setAddedAmount)}
                        <Field htmlFor="calc-frequency" label={t('pages.investingCalculator.frequency')}>
                            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                                <SelectTrigger id="calc-frequency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={FREQUENCIES.DAILY}>{t('pages.investingCalculator.daily')}</SelectItem>
                                    <SelectItem value={FREQUENCIES.WEEKLY}>{t('pages.investingCalculator.weekly')}</SelectItem>
                                    <SelectItem value={FREQUENCIES.MONTHLY}>{t('pages.investingCalculator.monthly')}</SelectItem>
                                    <SelectItem value={FREQUENCIES.QUARTERLY}>{t('pages.investingCalculator.quarterly')}</SelectItem>
                                    <SelectItem value={FREQUENCIES.YEARLY}>{t('pages.investingCalculator.yearly')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        {numberField("calc-rate", t('pages.investingCalculator.interestRate'), interestRate, setInterestRate, "0.1")}
                        {numberField("calc-inflation", t('pages.investingCalculator.inflation'), inflation, setInflation, "0.1")}
                    </div>
                    {numberField("calc-years", t('pages.investingCalculator.timePeriod'), years, setYears)}
                    <Button variant="ghost" className="h-10 px-3 text-muted-foreground" onClick={handleReset}>
                        <RotateCcw aria-hidden="true" />
                        {t('pages.investingCalculator.reset')}
                    </Button>
                </section>

                <section aria-label={t('pages.investingCalculator.growthProjection')} className="min-w-0">
                    <MetricGrid metrics={metrics} size="lg" className="grid-cols-1 sm:grid-cols-3" formatAmount={money} />
                    <div className="mb-1.5 mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h2 className="text-[0.8125rem] font-normal text-muted-foreground">{t('pages.investingCalculator.growthProjection')}</h2>
                        <ul className="flex gap-4 text-[0.8125rem] text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <span aria-hidden="true" className="inline-block h-[2px] w-3.5 rounded-full bg-primary" />
                                {t('pages.investingCalculator.totalBalance')}
                            </li>
                            <li className="flex items-center gap-2">
                                <span aria-hidden="true" className="inline-block w-3.5 border-t-2 border-dashed border-muted-foreground/60" />
                                {t('pages.investingCalculator.totalInvested')}
                            </li>
                        </ul>
                    </div>
                    <SeriesLineChart
                        length={results.data.length}
                        primary={results.data.map((point) => point.balance)}
                        comparison={results.data.map((point) => point.invested)}
                        formatAxis={formatCurrencyCompact}
                        formatValue={money}
                        xLabel={yearLabel}
                        tooltipTitle={yearLabel}
                        primaryName={t('pages.investingCalculator.totalBalance')}
                        comparisonName={t('pages.investingCalculator.totalInvested')}
                        ariaLabel={t('pages.investingCalculator.chartAria', { years, amount: formatNumber(Math.round(results.finalBalance)) })}
                        height={300}
                    />
                </section>
            </div>
        </div>
    )
}
