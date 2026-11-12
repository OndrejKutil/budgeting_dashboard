import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BudgetMakerSkeleton } from '@/components/skeletons';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, Copy, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
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
import { BudgetColumnHeader, BudgetSection, type RowPatch } from '@/components/budget/BudgetSection';
import { interpolate } from '@/components/data/interpolate';
import { useBudgetAutosave, type SaveStatus } from '@/components/budget/use-budget-autosave';
import {
    BUDGET_GROUPS,
    buildPlan,
    cloneRowsForNewMonth,
    budgetMoney,
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
    const { formatMonth, t, currency: userCurrency } = useUser();
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
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
    const totalAllocated = calculateTotal(rows.expense) + calculateTotal(rows.saving) + calculateTotal(rows.investment);
    const remainingBudget = totalIncome - totalAllocated;

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

    const monthLabel = monthOptions[selectedMonth - 1];
    const hasRows = ready && countRows(rows) > 0;

    // One quiet line above the table: planned in, allocated, left to plan.
    const figure = (value: number, className?: string) => (
        <span className={cn('tabular-nums', className ?? 'text-foreground')}>
            <SensitiveValue>{budgetMoney(value, userCurrency)}</SensitiveValue>
        </span>
    );
    const overAllocated = remainingBudget < -0.005;
    const summary = interpolate(
        t(overAllocated ? 'pages.budgetMaker.summaryOver' : 'pages.budgetMaker.summaryLeft'),
        {
            income: figure(totalIncome),
            allocated: figure(totalAllocated),
            left: figure(remainingBudget, remainingBudget > 0.005 ? 'text-primary' : 'text-muted-foreground'),
            over: figure(Math.abs(remainingBudget), 'text-destructive'),
        },
    );

    return (
        <div className="pb-32 lg:pb-12">
            {/* Header: title and period on the left; save status and quiet actions on the right. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-[1.625rem]">
                        {t('pages.budgetMaker.heading')}
                    </h1>
                    <PeriodNavigator
                        mode="month"
                        month={selectedMonth}
                        year={selectedYear}
                        years={yearOptions}
                        onChange={setPeriod}
                        className="[&>div:first-child]:gap-1 [&>div:first-child]:border-transparent [&>div:first-child]:bg-transparent [&>div:first-child]:p-0 [&>div:first-child]:shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2.5">
                    <SaveIndicator status={autosave.status} onRetry={autosave.retry} />
                    {hasRows && (
                        <>
                            <Dialog
                                open={isCopyOpen}
                                onOpenChange={(open) => {
                                    if (open) setCopyTarget(nextPeriod);
                                    setIsCopyOpen(open);
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="h-9 px-4">
                                        <Copy aria-hidden="true" /> {t('pages.budgetMaker.copyTo')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('pages.budgetMaker.copyTitle')}</DialogTitle>
                                        <DialogDescription>
                                            {t('pages.budgetMaker.copyDescription', { month: monthLabel, year: selectedYear })}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex gap-4 py-4">
                                        <div className="flex flex-1 flex-col gap-1.5">
                                            <Label className="text-[0.8125rem] font-normal text-muted-foreground">{t('pages.budgetMaker.targetMonth')}</Label>
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
                                        <div className="flex w-1/3 flex-col gap-1.5">
                                            <Label className="text-[0.8125rem] font-normal text-muted-foreground">{t('pages.budgetMaker.targetYear')}</Label>
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
                                            {copyMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                                            {t('pages.budgetMaker.copyBudget')}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                        aria-label={t('pages.budgetMaker.moreActions')}
                                    >
                                        <MoreHorizontal aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={() => setIsDeleteOpen(true)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                        {t('pages.budgetMaker.deleteBudget')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('pages.budgetMaker.deleteConfirmTitle')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('pages.budgetMaker.deleteConfirmDescription', { month: monthLabel, year: selectedYear })}
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
            </div>

            {error && !ready ? (
                <div role="alert" className="flex min-h-[20rem] flex-col items-center justify-center gap-4 text-center">
                    <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{t('pages.budgetMaker.loadFailed')}</p>
                    <Button variant="outline" onClick={() => refetch()}>{t('common.retry')}</Button>
                </div>
            ) : isLoading || !ready ? (
                <BudgetMakerSkeleton />
            ) : (
                <motion.div
                    key={periodKey}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {isEmpty ? (
                        <div className="mt-6 flex flex-col justify-between gap-3 border-b border-border pb-5 sm:flex-row sm:items-center">
                            <div>
                                <p className="text-[0.9375rem] font-medium">
                                    {t('pages.budgetMaker.emptyTitle', { month: monthLabel, year: selectedYear })}
                                </p>
                                <p className="text-sm text-muted-foreground">{t('pages.budgetMaker.emptyDescription')}</p>
                            </div>
                            {prevHasRows && (
                                <Button variant="outline" onClick={copyFromPrevious} className="h-9 shrink-0 px-4">
                                    <Copy aria-hidden="true" />
                                    {t('pages.budgetMaker.copyFromPrevious', { month: monthOptions[prevPeriod.month - 1], year: prevPeriod.year })}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p className="mt-5 text-[0.90625rem] text-muted-foreground" aria-live="polite">{summary}</p>
                    )}

                    <div data-budget-table="" className="mt-6">
                        <BudgetColumnHeader />
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
                    </div>
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
                return <><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden="true" />{t('pages.budgetMaker.unsavedStatus')}</>;
            case 'saving':
                return <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{t('pages.budgetMaker.savingStatus')}</>;
            case 'saved':
                return <><Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />{t('pages.budgetMaker.savedStatus')}</>;
            case 'invalid':
                return <span className="flex items-center gap-1.5 text-warning"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{t('pages.budgetMaker.invalidStatus')}</span>;
            case 'error':
                return (
                    <span className="flex items-center gap-1.5 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{t('pages.budgetMaker.errorStatus')}
                        <Button variant="link" size="sm" className="h-auto p-0 text-destructive underline" onClick={onRetry}>{t('common.retry')}</Button>
                    </span>
                );
            default:
                return null;
        }
    })();

    return (
        <span role="status" aria-live="polite" className="flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem] text-muted-foreground">
            {content}
        </span>
    );
}
