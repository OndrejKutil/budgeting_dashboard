"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { dividendApi } from "@/lib/api/endpoints/dividends"
import type { DividendStockRow, DividendYieldFrequency } from "@/lib/api/types/base"
import type { DividendPortfolioRequest } from "@/lib/api/types/requests"
import { getErrorMessage } from "@/lib/api/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { MetricGrid, type Metric } from "@/components/data/MetricGrid"
import { SensitiveValue } from "@/components/privacy/SensitiveValue"
import { formatMoneyParts, formatMoneyWhole } from "@/lib/currency"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/user-context"

// ================================================================================================
//                                   Types & Constants
// ================================================================================================

interface LocalStockRow extends DividendStockRow {
    _id: string // stable local key for React rendering
}

const EMPTY_ROW = (): LocalStockRow => ({
    _id: crypto.randomUUID(),
    ticker: "",
    weight_pct: 0,
    dividend_yield: 0,
    yield_frequency: "annual",
})

// ================================================================================================
//                                   Calculation Helper (client-side)
// ================================================================================================

interface CalculatedResults {
    weightedAvgYield: number
    annualIncome: number
    monthlyIncome: number
    totalWeight: number
    perStockAnnualIncome: number[]
}

function calcResults(portfolioValue: number, rows: LocalStockRow[]): CalculatedResults {
    const validRows = rows.filter((r) => r.ticker.trim() !== "")
    const totalWeight = validRows.reduce((s, r) => s + Number(r.weight_pct), 0)

    const annualYield = (r: LocalStockRow) =>
        r.yield_frequency === "monthly"
            ? Number(r.dividend_yield) * 12
            : r.yield_frequency === "quarterly"
            ? Number(r.dividend_yield) * 4
            : Number(r.dividend_yield)

    const weightedAvgYield =
        validRows.length > 0
            ? validRows.reduce((s, r) => s + Number(r.weight_pct) * annualYield(r), 0) / 100
            : 0

    const annualIncome = portfolioValue > 0 ? (portfolioValue * weightedAvgYield) / 100 : 0
    const monthlyIncome = annualIncome / 12

    const perStockAnnualIncome = rows.map((r) => {
        if (!r.ticker.trim() || portfolioValue <= 0) return 0
        const stockValue = portfolioValue * (Number(r.weight_pct) / 100)
        return (stockValue * annualYield(r)) / 100
    })

    return { weightedAvgYield, annualIncome, monthlyIncome, totalWeight, perStockAnnualIncome }
}

// ================================================================================================
//                                   Main Component
// ================================================================================================

export default function DividendCalculator() {
    const { t, locale, formatNumber, currency: userCurrency } = useUser()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // --- Remote state ---
    const {
        data: serverData,
        isLoading,
        error: fetchError,
    } = useQuery({
        queryKey: ["dividend-portfolio"],
        queryFn: async () => {
            const res = await dividendApi.getPortfolio()
            return res.data
        },
    })

    // Whether backend has an existing record (determined by non-empty rows or non-zero value)
    const hasExistingRecord = useRef<boolean>(false)

    // --- Local editable state ---
    const [portfolioValue, setPortfolioValue] = useState<number>(0)
    const [rows, setRows] = useState<LocalStockRow[]>([EMPTY_ROW()])
    const [isDirty, setIsDirty] = useState(false)

    // Sync server data into local state once loaded
    useEffect(() => {
        if (!serverData) return
        const serverRows = serverData.data.rows
        hasExistingRecord.current =
            serverData.data.portfolio_value > 0 || serverRows.length > 0

        setPortfolioValue(serverData.data.portfolio_value)
        setRows(
            serverRows.length > 0
                ? serverRows.map((r) => ({ ...r, _id: crypto.randomUUID() }))
                : [EMPTY_ROW()]
        )
        setIsDirty(false)
    }, [serverData])

    // --- Mutations ---
    const saveMutation = useMutation({
        mutationFn: async (payload: DividendPortfolioRequest) => {
            if (hasExistingRecord.current) {
                return dividendApi.updatePortfolio(payload)
            }
            return dividendApi.createPortfolio(payload)
        },
        onSuccess: (res) => {
            hasExistingRecord.current = true
            setIsDirty(false)
            queryClient.invalidateQueries({ queryKey: ["dividend-portfolio"] })
            toast({ title: t('pages.dividendCalculator.saved'), description: res.data.message })
        },
        onError: (err) => {
            const msg = getErrorMessage(err, t('pages.dividendCalculator.saveFailed'))
            toast({ title: t('common.error'), description: msg, variant: "destructive" })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => dividendApi.deletePortfolio(),
        onSuccess: () => {
            hasExistingRecord.current = false
            setPortfolioValue(0)
            setRows([EMPTY_ROW()])
            setIsDirty(false)
            queryClient.invalidateQueries({ queryKey: ["dividend-portfolio"] })
            toast({ title: t('pages.dividendCalculator.deleted'), description: t('pages.dividendCalculator.cleared') })
        },
        onError: (err) => {
            const msg = getErrorMessage(err, t('pages.dividendCalculator.deleteFailed'))
            toast({ title: t('common.error'), description: msg, variant: "destructive" })
        },
    })

    // --- Derived calculations ---
    const calc = useMemo(
        () => calcResults(portfolioValue, rows),
        [portfolioValue, rows]
    )

    const weightError = Math.abs(calc.totalWeight - 100) > 0.01 && rows.some((r) => r.ticker.trim())

    // --- Handlers ---
    const markDirty = useCallback(() => setIsDirty(true), [])

    const handlePortfolioValueChange = (v: number) => {
        setPortfolioValue(v)
        markDirty()
    }

    const handleRowChange = (id: string, field: keyof LocalStockRow, value: string | number) => {
        setRows((prev) =>
            prev.map((r) =>
                r._id === id ? { ...r, [field]: value } : r
            )
        )
        markDirty()
    }

    const addRow = () => {
        setRows((prev) => [...prev, EMPTY_ROW()])
        markDirty()
    }

    const removeRow = (id: string) => {
        setRows((prev) => {
            const next = prev.filter((r) => r._id !== id)
            return next.length > 0 ? next : [EMPTY_ROW()]
        })
        markDirty()
    }

    const handleSave = () => {
        const validRows = rows.filter((r) => r.ticker.trim() !== "")
        if (validRows.length > 0 && weightError) {
            toast({
                title: t('pages.dividendCalculator.validationError'),
                description: t('pages.dividendCalculator.weightError', { weight: calc.totalWeight.toFixed(2) }),
                variant: "destructive",
            })
            return
        }
        const payload: DividendPortfolioRequest = {
            portfolio_value: portfolioValue,
            portfolio: validRows.map(({ _id, ...r }) => r),
        }
        saveMutation.mutate(payload)
    }

    const handleDelete = () => {
        if (!hasExistingRecord.current) {
            // Just reset locally
            setPortfolioValue(0)
            setRows([EMPTY_ROW()])
            setIsDirty(false)
            return
        }
        deleteMutation.mutate()
    }

    const isBusy = saveMutation.isPending || deleteMutation.isPending

    // -------------------------------- Render --------------------------------

    const title = (
        <div className="min-w-0">
            <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
                {t('pages.dividendCalculator.title')}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">{t('pages.dividendCalculator.description')}</p>
        </div>
    )

    if (isLoading) {
        return (
            <div aria-busy="true">
                {title}
                <div className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
                <Skeleton className="mt-10 h-48 w-full" />
            </div>
        )
    }

    if (fetchError) {
        return (
            <div>
                {title}
                <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
                    <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                    <p className="font-medium">{t('pages.dividendCalculator.loadFailed')}</p>
                    <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["dividend-portfolio"] })}>
                        {t('common.retry')}
                    </Button>
                </div>
            </div>
        )
    }

    const currency = userCurrency
    const money = (value: number) => formatMoneyWhole(value, currency)
    const percent = (value: number) => formatNumber(value / 100, { style: "percent", maximumFractionDigits: 2 })
    const percentParts = (value: number) =>
        new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).formatToParts(value / 100)

    const metrics: Metric[] = [
        {
            key: "value",
            label: t('pages.dividendCalculator.portfolioValue'),
            value: portfolioValue,
            parts: formatMoneyParts(portfolioValue, currency, 0),
            note: t('pages.dividendCalculator.valueSubtitle'),
        },
        {
            key: "yield",
            label: t('pages.dividendCalculator.weightedAvgYield'),
            value: calc.weightedAvgYield,
            parts: percentParts(calc.weightedAvgYield),
            note: t('pages.dividendCalculator.weightedSubtitle'),
        },
        {
            key: "annual",
            label: t('pages.dividendCalculator.annualIncome'),
            value: calc.annualIncome,
            parts: formatMoneyParts(calc.annualIncome, currency, 0),
            accent: true,
            note: t('pages.dividendCalculator.annualSubtitle'),
        },
        {
            key: "monthly",
            label: t('pages.dividendCalculator.monthlyIncome'),
            value: calc.monthlyIncome,
            parts: formatMoneyParts(calc.monthlyIncome, currency, 0),
            note: t('pages.dividendCalculator.monthlySubtitle'),
        },
    ]

    const payouts = [
        { key: "daily", label: t('pages.dividendCalculator.daily'), value: calc.annualIncome / 365 },
        { key: "monthly", label: t('pages.dividendCalculator.monthly'), value: calc.monthlyIncome },
        { key: "quarterly", label: t('pages.dividendCalculator.quarterly'), value: calc.annualIncome / 4 },
        { key: "annual", label: t('pages.dividendCalculator.annual'), value: calc.annualIncome },
    ]

    const headCell = "py-2.5 text-[0.8125rem] font-normal text-muted-foreground"

    return (
        <div>
            <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                {title}
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={isBusy}
                        className="h-11 px-4 text-muted-foreground hover:text-destructive"
                    >
                        {deleteMutation.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                        {t('pages.dividendCalculator.clear')}
                    </Button>
                    <Button onClick={handleSave} disabled={isBusy || !isDirty} className="h-11 px-5">
                        {saveMutation.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                        {t('pages.dividendCalculator.save')}
                    </Button>
                </div>
            </header>

            <section aria-label={t('pages.dividendCalculator.title')} className="mt-8 lg:mt-10">
                <MetricGrid metrics={metrics} size="lg" className="grid-cols-2 lg:grid-cols-4" formatAmount={money} />
            </section>

            <section aria-label={t('pages.dividendCalculator.settings')} className="mt-10 max-w-xs">
                <Field htmlFor="portfolio-value" label={t('pages.dividendCalculator.totalValue')} hint={t('pages.dividendCalculator.settingsDescription')}>
                    <Input
                        id="portfolio-value"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={100}
                        value={portfolioValue}
                        onChange={(e) => handlePortfolioValueChange(Number(e.target.value))}
                        className="tabular-nums"
                    />
                </Field>
            </section>

            <section aria-labelledby="dividend-holdings" className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-foreground/30 pb-3">
                    <div className="min-w-0">
                        <h2 id="dividend-holdings" className="text-[1.125rem] font-medium tracking-[-0.01em]">
                            {t('pages.dividendCalculator.holdings')}
                        </h2>
                        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{t('pages.dividendCalculator.yieldHint')}</p>
                    </div>
                    <Button variant="outline" onClick={addRow} className="h-10 px-4">
                        <Plus aria-hidden="true" />
                        {t('pages.dividendCalculator.addStock')}
                    </Button>
                </div>

                {weightError && (
                    <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('pages.dividendCalculator.weightsSum', { total: percent(calc.totalWeight) })}
                    </p>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-sm">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className={cn(headCell, "pr-3")}>{t('pages.dividendCalculator.ticker')}</th>
                                <th className={cn(headCell, "px-3")}>{t('pages.dividendCalculator.weight')}</th>
                                <th className={cn(headCell, "px-3")}>{t('pages.dividendCalculator.yieldPerPayment')}</th>
                                <th className={cn(headCell, "px-3")}>{t('pages.dividendCalculator.frequency')}</th>
                                <th className={cn(headCell, "px-3 text-right")}>{t('pages.dividendCalculator.annualIncome')}</th>
                                <th className="w-10"><span className="sr-only">{t('common.actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={row._id} className="border-b border-border">
                                    <td className="py-2 pr-3">
                                        <Input
                                            id={`ticker-${row._id}`}
                                            aria-label={t('pages.dividendCalculator.ticker')}
                                            placeholder="AAPL"
                                            value={row.ticker}
                                            onChange={(e) => handleRowChange(row._id, "ticker", e.target.value.toUpperCase())}
                                            className="w-28 font-mono uppercase"
                                            maxLength={10}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            id={`weight-${row._id}`}
                                            aria-label={t('pages.dividendCalculator.weight')}
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.1}
                                            value={row.weight_pct}
                                            onChange={(e) => handleRowChange(row._id, "weight_pct", e.target.value)}
                                            className="w-24 tabular-nums"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            id={`yield-${row._id}`}
                                            aria-label={t('pages.dividendCalculator.yield')}
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={row.dividend_yield}
                                            onChange={(e) => handleRowChange(row._id, "dividend_yield", e.target.value)}
                                            className="w-24 tabular-nums"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Select
                                            value={row.yield_frequency}
                                            onValueChange={(v) => handleRowChange(row._id, "yield_frequency", v as DividendYieldFrequency)}
                                        >
                                            <SelectTrigger className="w-32" id={`freq-${row._id}`} aria-label={t('pages.dividendCalculator.frequency')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="annual">{t('pages.dividendCalculator.annual')}</SelectItem>
                                                <SelectItem value="quarterly">{t('pages.dividendCalculator.quarterly')}</SelectItem>
                                                <SelectItem value="monthly">{t('pages.dividendCalculator.monthly')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                        <SensitiveValue>{money(calc.perStockAnnualIncome[idx] ?? 0)}</SensitiveValue>
                                    </td>
                                    <td className="py-2 pl-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`${t('common.delete')}: ${row.ticker || t('pages.dividendCalculator.ticker')}`}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeRow(row._id)}
                                            id={`delete-row-${row._id}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {rows.some((r) => r.ticker.trim()) && (
                            <tfoot>
                                <tr>
                                    <td className={cn(headCell, "pr-3 pt-3")}>{t('pages.dividendCalculator.total')}</td>
                                    <td className={cn("px-3 pt-3 tabular-nums", weightError ? "text-destructive" : "text-foreground")}>
                                        {percent(calc.totalWeight)}
                                    </td>
                                    <td className="px-3 pt-3 tabular-nums text-muted-foreground">{percent(calc.weightedAvgYield)}</td>
                                    <td className="px-3 pt-3"></td>
                                    <td className="px-3 pt-3 text-right tabular-nums text-foreground">
                                        <SensitiveValue>{money(calc.annualIncome)}</SensitiveValue>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </section>

            {calc.annualIncome > 0 && (
                <section aria-labelledby="dividend-payouts" className="mt-12">
                    <h2 id="dividend-payouts" className="mb-1.5 text-[0.8125rem] font-normal text-muted-foreground">
                        {t('pages.dividendCalculator.payouts')}
                    </h2>
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                        {payouts.map((payout) => (
                            <div key={payout.key} className="border-t border-border pt-2.5">
                                <dt className="text-[0.8125rem] text-muted-foreground">{payout.label}</dt>
                                <dd className="text-[1.125rem] tabular-nums">
                                    <SensitiveValue>{money(payout.value)}</SensitiveValue>
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-3 text-[0.8125rem] text-muted-foreground">{t('pages.dividendCalculator.estimatesNote')}</p>
                </section>
            )}
        </div>
    )
}
