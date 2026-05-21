"use client"

import { useState, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Calculator, TrendingUp, RotateCcw } from "lucide-react"
import { useSearchParams, useLocation } from "react-router-dom"
import { useUrlState } from "@/hooks/use-url-state"
import { Button } from "@/components/ui/button"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { useUser } from '@/contexts/user-context';

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
    const { formatCurrency, t } = useUser()
    const chartConfig = useMemo(() => ({
        invested: {
            label: t('pages.investingCalculator.totalInvested'),
            color: "hsl(var(--muted-foreground))",
        },
        balance: {
            label: t('pages.investingCalculator.totalBalance'),
            color: "hsl(var(--primary))",
        },
    } satisfies ChartConfig), [t])

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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Calculator className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                    {t('pages.investingCalculator.title')}
                </h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* --- Left Column: Input Form --- */}
                <Card className="lg:col-span-4 border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle>{t('pages.investingCalculator.parameters')}</CardTitle>
                        <CardDescription>
                            {t('pages.investingCalculator.parametersDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('pages.investingCalculator.startingAmount')}</Label>
                                <Input
                                    type="number"
                                    value={startingAmount}
                                    onChange={(e) => setStartingAmount(Number(e.target.value))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('pages.investingCalculator.contribution')}</Label>
                                    <Input
                                        type="number"
                                        value={addedAmount}
                                        onChange={(e) => setAddedAmount(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('pages.investingCalculator.frequency')}</Label>
                                    <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                                        <SelectTrigger>
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
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('pages.investingCalculator.interestRate')}</Label>
                                    <Input
                                        type="number"
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('pages.investingCalculator.inflation')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={inflation}
                                        onChange={(e) => setInflation(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('pages.investingCalculator.timePeriod')}</Label>
                                <Input
                                    type="number"
                                    value={years}
                                    onChange={(e) => setYears(Number(e.target.value))}
                                />
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleReset}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t('pages.investingCalculator.reset')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* --- Right Column: Results & Chart --- */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-border/50 shadow-sm bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('pages.investingCalculator.futureBalance')}</CardTitle>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">
                                    {formatCurrency(results.finalBalance)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('pages.investingCalculator.afterYears', { years })} {inflation > 0 && `(${t('pages.investingCalculator.adjustingForInflation', { inflation })})`}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('pages.investingCalculator.totalContributed')}</CardTitle>
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(results.totalInvested)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('pages.investingCalculator.principalPlus', { years })}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Area */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle>{t('pages.investingCalculator.growthProjection')}</CardTitle>
                            <CardDescription>
                                {t('pages.investingCalculator.growthDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[400px] w-full">
                                <AreaChart
                                    data={results.data}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="fillInvested" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-invested)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-invested)" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="year"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => t('pages.investingCalculator.yearLabel', { year: value })}
                                        className="text-muted-foreground text-xs"
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) =>
                                            new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(value)
                                        }
                                        className="text-muted-foreground text-xs"
                                        width={60}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                    <Area
                                        dataKey="balance"
                                        type="monotone"
                                        fill="url(#fillBalance)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-balance)"
                                        stackId="1" // Independent layers because balance includes invested
                                    />
                                    <Area
                                        dataKey="invested"
                                        type="monotone"
                                        fill="url(#fillInvested)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-invested)"
                                        stackId="2"
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
