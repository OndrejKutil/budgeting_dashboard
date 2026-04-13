"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
    TrendingUp,
    PlusCircle,
    Trash2,
    Save,
    Loader2,
    CircleDollarSign,
    Pencil,
    AlertTriangle,
    RefreshCcw,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { dividendApi } from "@/lib/api/endpoints/dividends"
import type { DividendStockRow, DividendYieldFrequency } from "@/lib/api/types/base"
import type { DividendPortfolioRequest } from "@/lib/api/types/requests"
import { ApiError } from "@/lib/api/client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
//                                   Sub-components
// ================================================================================================

interface StatCardProps {
    title: string
    value: string
    subtitle?: string
    icon: React.ReactNode
    accent?: boolean
}

function StatCard({ title, value, subtitle, icon, accent }: StatCardProps) {
    return (
        <Card className={`border-border/50 shadow-sm ${accent ? "bg-primary/5" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    )
}

// ================================================================================================
//                                   Main Component
// ================================================================================================

export default function DividendCalculator() {
    const { formatCurrency } = useUser()
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
            toast({ title: "Saved", description: res.data.message })
        },
        onError: (err) => {
            const msg = err instanceof ApiError ? err.message : "Failed to save portfolio."
            toast({ title: "Error", description: msg, variant: "destructive" })
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
            toast({ title: "Deleted", description: "Portfolio cleared successfully." })
        },
        onError: (err) => {
            const msg = err instanceof ApiError ? err.message : "Failed to delete portfolio."
            toast({ title: "Error", description: msg, variant: "destructive" })
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
                title: "Validation error",
                description: `Weights must sum to 100% (currently ${calc.totalWeight.toFixed(2)}%).`,
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p>Failed to load dividend portfolio.</p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["dividend-portfolio"] })}
                >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CircleDollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                            Dividend Calculator
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Track your dividend portfolio and estimate income
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isBusy}
                        className="text-destructive hover:text-destructive hover:border-destructive"
                    >
                        {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">Clear</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isBusy || !isDirty}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Save</span>
                    </Button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Portfolio Value"
                    value={formatCurrency(portfolioValue)}
                    subtitle="Used for income estimates"
                    icon={<CircleDollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard
                    title="Weighted Avg Yield"
                    value={`${calc.weightedAvgYield.toFixed(2)}%`}
                    subtitle="Annual, weighted by position"
                    icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    accent
                />
                <StatCard
                    title="Annual Income"
                    value={formatCurrency(calc.annualIncome)}
                    subtitle="Estimated annual dividends"
                    icon={<TrendingUp className="h-4 w-4 text-primary" />}
                    accent
                />
                <StatCard
                    title="Monthly Income"
                    value={formatCurrency(calc.monthlyIncome)}
                    subtitle="Annual ÷ 12"
                    icon={<CircleDollarSign className="h-4 w-4 text-muted-foreground" />}
                />
            </div>

            {/* Portfolio value input row */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Portfolio Settings</CardTitle>
                    <CardDescription>Set your total portfolio value for income calculations</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 max-w-xs">
                        <Label htmlFor="portfolio-value" className="whitespace-nowrap">
                            Total Value
                        </Label>
                        <Input
                            id="portfolio-value"
                            type="number"
                            min={0}
                            step={100}
                            value={portfolioValue}
                            onChange={(e) => handlePortfolioValueChange(Number(e.target.value))}
                            placeholder="e.g. 50000"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Stock table */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Holdings
                        </CardTitle>
                        <CardDescription className="mt-1">
                            One row per stock. Weights must sum to 100%.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={addRow}>
                        <PlusCircle className="h-4 w-4 mr-1.5" />
                        Add Stock
                    </Button>
                </CardHeader>

                <CardContent className="overflow-x-auto">
                    {/* Weight validation banner */}
                    {weightError && (
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            Weights sum to <strong className="mx-1">{calc.totalWeight.toFixed(2)}%</strong>
                            — they must equal 100% before saving.
                        </div>
                    )}

                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-muted-foreground border-b border-border/50">
                                <th className="pb-2 pr-3 font-medium">Ticker</th>
                                <th className="pb-2 px-3 font-medium">Weight&nbsp;%</th>
                                <th className="pb-2 px-3 font-medium">Yield&nbsp;%</th>
                                <th className="pb-2 px-3 font-medium">Frequency</th>
                                <th className="pb-2 px-3 font-medium text-right">Annual&nbsp;Income</th>
                                <th className="pb-2 pl-3 font-medium w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {rows.map((row, idx) => (
                                <tr key={row._id} className="group">
                                    {/* Ticker */}
                                    <td className="py-2 pr-3">
                                        <Input
                                            id={`ticker-${row._id}`}
                                            placeholder="e.g. AAPL"
                                            value={row.ticker}
                                            onChange={(e) =>
                                                handleRowChange(row._id, "ticker", e.target.value.toUpperCase())
                                            }
                                            className="h-8 w-28 uppercase font-mono"
                                            maxLength={10}
                                        />
                                    </td>

                                    {/* Weight */}
                                    <td className="py-2 px-3">
                                        <Input
                                            id={`weight-${row._id}`}
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.1}
                                            value={row.weight_pct}
                                            onChange={(e) =>
                                                handleRowChange(row._id, "weight_pct", e.target.value)
                                            }
                                            className="h-8 w-24"
                                        />
                                    </td>

                                    {/* Yield */}
                                    <td className="py-2 px-3">
                                        <Input
                                            id={`yield-${row._id}`}
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={row.dividend_yield}
                                            onChange={(e) =>
                                                handleRowChange(row._id, "dividend_yield", e.target.value)
                                            }
                                            className="h-8 w-24"
                                        />
                                    </td>

                                    {/* Frequency */}
                                    <td className="py-2 px-3">
                                        <Select
                                            value={row.yield_frequency}
                                            onValueChange={(v) =>
                                                handleRowChange(row._id, "yield_frequency", v as DividendYieldFrequency)
                                            }
                                        >
                                            <SelectTrigger className="h-8 w-28" id={`freq-${row._id}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="annual">Annual</SelectItem>
                                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </td>

                                    {/* Per-stock income */}
                                    <td className="py-2 px-3 text-right tabular-nums font-mono text-muted-foreground">
                                        {formatCurrency(calc.perStockAnnualIncome[idx] ?? 0)}
                                    </td>

                                    {/* Delete */}
                                    <td className="py-2 pl-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={() => removeRow(row._id)}
                                            id={`delete-row-${row._id}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        {/* Footer totals */}
                        {rows.some((r) => r.ticker.trim()) && (
                            <tfoot>
                                <tr className="border-t border-border text-muted-foreground font-medium">
                                    <td className="pt-3 pr-3 text-xs uppercase tracking-wide">Total</td>
                                    <td className={`pt-3 px-3 tabular-nums ${weightError ? "text-destructive font-bold" : "text-foreground"}`}>
                                        {calc.totalWeight.toFixed(2)}%
                                    </td>
                                    <td className="pt-3 px-3 tabular-nums">
                                        {calc.weightedAvgYield.toFixed(2)}%
                                    </td>
                                    <td className="pt-3 px-3"></td>
                                    <td className="pt-3 px-3 text-right tabular-nums font-mono text-foreground">
                                        {formatCurrency(calc.annualIncome)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    {/* Add row button below table */}
                    <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={addRow} className="w-full">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Another Stock
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Monthly breakdown callout */}
            {calc.annualIncome > 0 && (
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                    <CardContent className="py-4">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Daily</p>
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(calc.annualIncome / 365)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly</p>
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(calc.monthlyIncome)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Quarterly</p>
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(calc.annualIncome / 4)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Annual</p>
                                <p className="text-lg font-bold text-primary">
                                    {formatCurrency(calc.annualIncome)}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground ml-auto hidden md:block">
                                * Estimates — assumes dividends are evenly distributed throughout the year.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
