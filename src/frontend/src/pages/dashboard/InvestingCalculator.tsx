"use client"

import { useState, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Calculator, TrendingUp } from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
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
import { useUser } from "@/contexts/UserContext"

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

const formSchema = z.object({
    startingAmount: z.coerce.number().min(0, "Must be positive"),
    addedAmount: z.coerce.number().min(0, "Must be positive"),
    frequency: z.enum([
        FREQUENCIES.DAILY,
        FREQUENCIES.WEEKLY,
        FREQUENCIES.MONTHLY,
        FREQUENCIES.QUARTERLY,
        FREQUENCIES.YEARLY,
    ]),
    interestRate: z.coerce.number().min(0, "Must be positive"),
    years: z.coerce.number().min(1, "Must be at least 1 year").max(50, "Max 50 years"),
    inflation: z.coerce.number().min(0).default(0),
})

type FormValues = z.infer<typeof formSchema>

// Chart configuration for shadcn/ui chart component
const chartConfig = {
    invested: {
        label: "Total Invested",
        color: "hsl(var(--muted-foreground))",
    },
    balance: {
        label: "Total Balance",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig

export default function InvestingCalculator() {

    // --- State & Form ---
    const { formatCurrency } = useUser()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            startingAmount: 10000,
            addedAmount: 500,
            frequency: FREQUENCIES.MONTHLY,
            interestRate: 7,
            years: 10,
            inflation: 0,
        },
    })

    // Watch all form values to trigger real-time recalculation
    const values = form.watch()

    // --- Calculation Logic ---

    const results = useMemo(() => {
        // Cast values to Number to ensure they are treated as numbers, not strings.
        // This prevents string concatenation bugs when inputs are being typed.
        const startingAmount = Number(values.startingAmount)
        const addedAmount = Number(values.addedAmount)
        const interestRate = Number(values.interestRate)
        const years = Number(values.years)
        const inflation = Number(values.inflation)
        const frequency = values.frequency

        // 1. Determine the effective annual interest rate.
        //    If inflation is > 0, we subtract it from the nominal interest rate to get the "real" return.
        //    This helps users see the purchasing power of their money in the future.
        const nominalRate = interestRate / 100
        const inflationRate = inflation / 100
        const effectiveRate = nominalRate - inflationRate

        const periodsPerYear = PERIODS_PER_YEAR[frequency as Frequency]

        // Calculate rate per period (e.g., monthly rate)
        // If effective rate is negative (inflation > interest), we still calculate mathematically
        const ratePerPeriod = effectiveRate / periodsPerYear

        const dataPoints = []

        let currentBalance = startingAmount
        let totalInvested = startingAmount

        // Add initial point (Year 0)
        dataPoints.push({
            year: 0,
            invested: Math.round(startingAmount),
            balance: Math.round(startingAmount),
        })

        for (let year = 1; year <= years; year++) {
            // Simulate the compounding for all periods in this year
            for (let p = 0; p < periodsPerYear; p++) {
                // 1. Add contribution
                currentBalance += addedAmount
                totalInvested += addedAmount

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
    }, [values])

    // --- Render ---

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Calculator className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                    Compound Growth Calculator
                </h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* --- Left Column: Input Form --- */}
                <Card className="lg:col-span-4 border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle>Parameters</CardTitle>
                        <CardDescription>
                            Adjust the values to simulate different scenarios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="startingAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Starting Amount</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="addedAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contribution</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="frequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Frequency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select frequency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value={FREQUENCIES.DAILY}>Daily</SelectItem>
                                                        <SelectItem value={FREQUENCIES.WEEKLY}>Weekly</SelectItem>
                                                        <SelectItem value={FREQUENCIES.MONTHLY}>Monthly</SelectItem>
                                                        <SelectItem value={FREQUENCIES.QUARTERLY}>Quarterly</SelectItem>
                                                        <SelectItem value={FREQUENCIES.YEARLY}>Yearly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="interestRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Interest Rate (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="inflation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Inflation (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.1" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="years"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Time Period (Years)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* --- Right Column: Results & Chart --- */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-border/50 shadow-sm bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Future Balance</CardTitle>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">
                                    {formatCurrency(results.finalBalance)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    After {values.years} years {values.inflation > 0 && `(adjusting for ${values.inflation}% inflation)`}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Contributed</CardTitle>
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(results.totalInvested)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Principal + {values.years} years of contributions
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Area */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle>Growth Projection</CardTitle>
                            <CardDescription>
                                Visualizing the power of compound interest over time.
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
                                        tickFormatter={(value) => `Year ${value}`}
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