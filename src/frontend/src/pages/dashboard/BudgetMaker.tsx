import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { BudgetMakerSkeleton } from '@/components/skeletons';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Check, Copy, Loader2, Trash2 } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { ApiError, getErrorMessage } from '@/lib/api/client';
import { categoriesApi, budgetApi, tagsApi } from '@/lib/api/endpoints';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { PeriodNavigator } from '@/components/period/PeriodNavigator';
import { useAvailableYears } from '@/hooks/use-available-years';
import { BudgetSection, type RowPatch } from '@/components/budget/BudgetSection';
import { useBudgetAutosave, type SaveStatus } from '@/components/budget/use-budget-autosave';
import {
    BUDGET_GROUPS,
    buildPlan,
    cloneRowsForNewMonth,
    countRows,
    createEmptyRow,
    emptyRows,
    mergeActuals,
    parseAmount,
    rowsFromResponse,
    type BudgetGroup,
    type LocalBudgetRow,
    type RowsByGroup,
} from '@/components/budget/budget-rows';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const parseParam = (raw: string | null, min: number, max: number) => {
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

const shiftMonth = (month: number, year: number, delta: number) => {
    const idx = year * 12 + (month - 1) + delta;
    return { month: (idx % 12) + 1, year: Math.floor(idx / 12) };
};

export default function BudgetMaker() {
    const { formatCurrency, formatMonth, t, currency: userCurrency } = useUser();
    const queryClient = useQueryClient();
    const monthOptions = useMemo(() => MONTHS.map((_, index) => formatMonth(index, 'long')), [formatMonth]);

    // Period lives in the URL, like the other dashboard pages, so back/refresh/links keep it.
    const now = new Date();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedMonth = parseParam(searchParams.get('month'), 1, 12) ?? now.getMonth() + 1;
    const selectedYear = parseParam(searchParams.get('year'), 2000, 2100) ?? now.getFullYear();
    const setPeriod = (month: number, year: number) =>
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('month', String(month));
            next.set('year', String(year));
            return next;
        }, { replace: true });
    const prevPeriod = shiftMonth(selectedMonth, selectedYear, -1);
    const nextPeriod = shiftMonth(selectedMonth, selectedYear, 1);
    const periodKey = `${selectedYear}-${selectedMonth}`;
    const periodKeyRef = useRef(periodKey);
    periodKeyRef.current = periodKey;

    // Budgets are planned ahead, so offer one year past the newest one with data.
    const yearOptions = useAvailableYears({ future: 1, include: selectedYear });

    // UI State
    const [isCopyOpen, setIsCopyOpen] = useState(false);
    const [openSections, setOpenSections] = useState<Record<BudgetGroup, boolean>>({
        income: true,
        expense: true,
        saving: true,
        investment: true,
    });
    const [copyTarget, setCopyTarget] = useState(nextPeriod);

    // Budget rows: local state is the source of truth once loaded; autosave pushes it to the server.
    const [rows, setRows] = useState<RowsByGroup>(emptyRows);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const ready = loadedKey === periodKey;

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await categoriesApi.getAll();
            return res.data || [];
        },
    });

    const { data: tags = [] } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await tagsApi.getAll();
            return res.data || [];
        },
    });

    const { data: budgetData, isLoading, error, refetch } = useQuery({
        queryKey: ['budget', selectedMonth, selectedYear],
        queryFn: () => budgetApi.getBudget(selectedMonth, selectedYear, userCurrency),
    });

    const onSynced = useCallback((month: number, year: number, fresh: Parameters<typeof mergeActuals>[1], sentIds: Parameters<typeof mergeActuals>[2]) => {
        if (periodKeyRef.current !== `${year}-${month}`) return;
        setRows(prev => mergeActuals(prev, fresh, sentIds));
    }, []);

    const onSaveError = useCallback((err: unknown) => {
        toast({
            title: t('common.error'),
            description: getErrorMessage(err as Error, t('pages.budgetMaker.saveFailed')),
            variant: 'destructive',
        });
    }, [t]);

    const autosave = useBudgetAutosave({
        month: selectedMonth,
        year: selectedYear,
        baseCurrency: userCurrency,
        rows,
        ready,
        onSynced,
        onError: onSaveError,
    });
    const { markClean } = autosave;

    // Load rows once per period. Later refetches of the same period are ignored on purpose:
    // they'd clobber edits in progress, and autosave already keeps the cache in sync.
    useEffect(() => {
        if (!budgetData?.data?.success || loadedKey === periodKey) return;
        const loaded = rowsFromResponse(budgetData.data);
        markClean(loaded);
        setRows(loaded);
        setLoadedKey(periodKey);
    }, [budgetData, periodKey, loadedKey, markClean]);

    const isEmpty = ready && countRows(rows) === 0;

    // Offer "copy from last month" when this month is empty.
    const { data: prevBudget } = useQuery({
        queryKey: ['budget', prevPeriod.month, prevPeriod.year],
        queryFn: () => budgetApi.getBudget(prevPeriod.month, prevPeriod.year, userCurrency),
        enabled: isEmpty,
    });
    const prevHasRows = !!prevBudget?.data?.success && countRows(rowsFromResponse(prevBudget.data)) > 0;

    // ---- Row operations --------------------------------------------------------------

    const setGroup = (group: BudgetGroup, fn: (list: LocalBudgetRow[]) => LocalBudgetRow[]) =>
        setRows(prev => ({ ...prev, [group]: fn(prev[group]) }));

    const addRow = (group: BudgetGroup) => {
        const row = createEmptyRow(group);
        setGroup(group, list => [...list, row]);
        return row.id;
    };

    const updateRow = (group: BudgetGroup, id: string, patch: RowPatch) =>
        setGroup(group, list => list.map(r => (r.id === id ? { ...r, ...patch } : r)));

    const removeRow = (group: BudgetGroup, id: string) => {
        const index = rows[group].findIndex(r => r.id === id);
        const removed = rows[group][index];
        if (!removed) return;
        setGroup(group, list => list.filter(r => r.id !== id));

        // Untouched new rows go silently; anything else gets an undo, since autosave makes deletes stick.
        if (removed.name.trim() === '' && parseAmount(removed.amount) === 0) return;
        const key = periodKey;
        toast({
            title: t('pages.budgetMaker.rowRemoved', { name: removed.name || t('pages.budgetMaker.itemName') }),
            action: (
                <ToastAction
                    altText={t('pages.budgetMaker.undo')}
                    onClick={() => {
                        if (periodKeyRef.current !== key) return;
                        setGroup(group, list => {
                            const next = [...list];
                            next.splice(Math.min(index, next.length), 0, removed);
                            return next;
                        });
                    }}
                >
                    {t('pages.budgetMaker.undo')}
                </ToastAction>
            ),
        });
    };

    const copyFromPrevious = () => {
        if (!prevBudget?.data) return;
        setRows(cloneRowsForNewMonth(prevBudget.data));
    };

    // ---- Totals ----------------------------------------------------------------------

    const calculateTotal = (list: LocalBudgetRow[]) =>
        list.filter(r => r.include_in_total).reduce((sum, r) => sum + (parseAmount(r.amount) || 0), 0);

    const totalIncome = calculateTotal(rows.income);
    const remainingBudget = totalIncome - calculateTotal(rows.expense) - calculateTotal(rows.saving) - calculateTotal(rows.investment);
    const remainingBudgetPct = totalIncome > 0 ? (remainingBudget / totalIncome) * 100 : 0;

    // ---- Budget-level mutations ------------------------------------------------------

    const deleteMutation = useMutation({
        mutationFn: () => budgetApi.deleteBudget(selectedMonth, selectedYear),
        onSuccess: () => {
            const cleared = emptyRows();
            markClean(cleared);
            setRows(cleared);
            queryClient.invalidateQueries({ queryKey: ['budget', selectedMonth, selectedYear] });
            toast({ title: t('pages.budgetMaker.deleted') });
        },
        onError: (err: Error | ApiError) => {
            toast({
                title: t('common.error'),
                description: getErrorMessage(err, t('pages.budgetMaker.deleteFailed')),
                variant: 'destructive',
            });
        }
    });

    const copyMutation = useMutation({
        mutationFn: async () => {
            const { plan } = buildPlan(rows);
            const { month, year } = copyTarget;
            try {
                return await budgetApi.updateBudget(month, year, plan);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    return await budgetApi.createBudget(month, year, plan);
                }
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', copyTarget.month, copyTarget.year] });
            toast({
                title: t('pages.budgetMaker.copied', { month: monthOptions[copyTarget.month - 1], year: copyTarget.year }),
                action: (
                    <ToastAction altText={t('pages.budgetMaker.openTarget')} onClick={() => setPeriod(copyTarget.month, copyTarget.year)}>
                        {t('pages.budgetMaker.openTarget')}
                    </ToastAction>
                ),
            });
            setIsCopyOpen(false);
        },
        onError: (err: Error | ApiError) => {
            toast({
                title: t('common.error'),
                description: getErrorMessage(err, t('pages.budgetMaker.copyFailed')),
                variant: 'destructive',
            });
        }
    });

    const sectionTitles: Record<BudgetGroup, string> = {
        income: t('metrics.income'),
        expense: t('metrics.expenses'),
        saving: t('metrics.savings'),
        investment: t('metrics.investments'),
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-32">
            <PageHeader
                title={t('pages.budgetMaker.title')}
                description={t('pages.budgetMaker.description')}
                actions={
                    <div className="flex items-center gap-2">
                        <SaveIndicator status={autosave.status} onRetry={autosave.retry} />
                        {ready && countRows(rows) > 0 && (
                            <>
                                <Dialog
                                    open={isCopyOpen}
                                    onOpenChange={(open) => {
                                        if (open) setCopyTarget(nextPeriod);
                                        setIsCopyOpen(open);
                                    }}
                                >
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Copy className="mr-2 h-4 w-4" /> {t('pages.budgetMaker.copyTo')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('pages.budgetMaker.copyTitle')}</DialogTitle>
                                            <DialogDescription>
                                                {t('pages.budgetMaker.copyDescription', { month: monthOptions[selectedMonth - 1], year: selectedYear })}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex gap-4 py-4">
                                            <div className="flex flex-col gap-1.5 flex-1">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('pages.budgetMaker.targetMonth')}</Label>
                                                <Select value={copyTarget.month.toString()} onValueChange={(val) => setCopyTarget(p => ({ ...p, month: parseInt(val) }))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {monthOptions.map((m, i) => (
                                                            <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-1.5 w-1/3">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('pages.budgetMaker.targetYear')}</Label>
                                                <Select value={copyTarget.year.toString()} onValueChange={(val) => setCopyTarget(p => ({ ...p, year: parseInt(val) }))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {yearOptions.map(y => (
                                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsCopyOpen(false)}>{t('common.cancel')}</Button>
                                            <Button onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending}>
                                                {copyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {t('pages.budgetMaker.copyBudget')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('pages.budgetMaker.deleteBudget')}
                                            title={t('pages.budgetMaker.deleteBudget')}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('pages.budgetMaker.deleteConfirmTitle')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('pages.budgetMaker.deleteConfirmDescription', { month: monthOptions[selectedMonth - 1], year: selectedYear })}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                                                {t('common.delete')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                    </div>
                }
            />

            {/* Period navigation */}
            <PeriodNavigator mode="month" month={selectedMonth} year={selectedYear} years={yearOptions} onChange={setPeriod} />

            {error && !ready ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <p className="text-sm text-muted-foreground">{t('pages.budgetMaker.loadFailed')}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>{t('common.retry')}</Button>
                </div>
            ) : isLoading || !ready ? (
                <BudgetMakerSkeleton />
            ) : (
                <motion.div
                    key={periodKey}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2"
                >
                    {isEmpty && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-4">
                            <div>
                                <p className="font-medium">
                                    {t('pages.budgetMaker.emptyTitle', { month: monthOptions[selectedMonth - 1], year: selectedYear })}
                                </p>
                                <p className="text-sm text-muted-foreground">{t('pages.budgetMaker.emptyDescription')}</p>
                            </div>
                            {prevHasRows && (
                                <Button onClick={copyFromPrevious} className="shrink-0">
                                    <Copy className="mr-2 h-4 w-4" />
                                    {t('pages.budgetMaker.copyFromPrevious', { month: monthOptions[prevPeriod.month - 1], year: prevPeriod.year })}
                                </Button>
                            )}
                        </div>
                    )}

                    {BUDGET_GROUPS.map(group => (
                        <BudgetSection
                            key={group}
                            title={sectionTitles[group]}
                            group={group}
                            rows={rows[group]}
                            totalIncome={totalIncome}
                            categories={categories}
                            tags={tags}
                            open={openSections[group]}
                            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [group]: open }))}
                            onAdd={() => addRow(group)}
                            onUpdate={(id, patch) => updateRow(group, id, patch)}
                            onRemove={(id) => removeRow(group, id)}
                            onReorder={(next) => setGroup(group, () => next)}
                        />
                    ))}

                    {/* Summary Card */}
                    <AnimatePresence>
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-24 left-4 right-4 lg:bottom-6 lg:right-6 lg:left-auto z-50"
                        >
                            <Card className="border-border bg-card shadow-sm">
                                <CardHeader className="py-4 px-6 flex flex-row items-center gap-6 space-y-0">
                                    <div>
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                            {t('metrics.remainingPlannedBudget')}
                                        </CardTitle>
                                        <div className={cn("text-3xl font-bold font-mono tracking-tight", remainingBudget >= 0 ? "text-foreground" : "text-destructive")}>
                                            <SensitiveValue>{formatCurrency(remainingBudget)}</SensitiveValue>
                                            <span className="text-sm ml-2 font-normal text-muted-foreground select-none">
                                                (<SensitiveValue>{remainingBudgetPct.toFixed(1)}%</SensitiveValue>)
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
    const { t } = useUser();

    const content = (() => {
        switch (status) {
            case 'pending':
                return <><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />{t('pages.budgetMaker.unsavedStatus')}</>;
            case 'saving':
                return <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('pages.budgetMaker.savingStatus')}</>;
            case 'saved':
                return <><Check className="h-3.5 w-3.5 text-success" />{t('pages.budgetMaker.savedStatus')}</>;
            case 'invalid':
                return <span className="flex items-center gap-1.5 text-warning"><AlertCircle className="h-3.5 w-3.5" />{t('pages.budgetMaker.invalidStatus')}</span>;
            case 'error':
                return (
                    <span className="flex items-center gap-1.5 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />{t('pages.budgetMaker.errorStatus')}
                        <Button variant="link" size="sm" className="h-auto p-0 text-destructive underline" onClick={onRetry}>{t('common.retry')}</Button>
                    </span>
                );
            default:
                return null;
        }
    })();

    return (
        <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2 whitespace-nowrap">
            {content}
        </span>
    );
}
