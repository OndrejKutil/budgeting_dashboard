import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Plus, Trash2, Save, Loader2, Pencil, X, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { categoriesApi, budgetApi, ApiError } from '@/lib/api/client';
import { BudgetPlan, BudgetPlanRow } from '@/lib/api/types/requests';
import { BudgetRowResponse } from '@/lib/api/types/responses';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
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

// Types for local state
interface LocalBudgetRow extends BudgetPlanRow {
    id: string; // Internal ID for React keys
    actual?: number | null;
    diff?: number | null;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BudgetMaker() {
    const { formatCurrency } = useUser();
    const queryClient = useQueryClient();

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [isCopyOpen, setIsCopyOpen] = useState(false);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        income: true,
        expense: true,
        saving: true,
        investment: true
    });

    // Date State
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Copy Target State (default to next month)
    const [copyTargetMonth, setCopyTargetMonth] = useState<number>(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
    const [copyTargetYear, setCopyTargetYear] = useState<number>(new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear());


    // Budget Rows State
    const [incomeRows, setIncomeRows] = useState<LocalBudgetRow[]>([]);
    const [expenseRows, setExpenseRows] = useState<LocalBudgetRow[]>([]);
    const [savingsRows, setSavingsRows] = useState<LocalBudgetRow[]>([]);
    const [investmentRows, setInvestmentRows] = useState<LocalBudgetRow[]>([]);

    // Fetch Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await categoriesApi.getAll();
            return res.data || [];
        },
    });

    // Fetch Budget
    const { data: budgetData, isLoading, error } = useQuery({
        queryKey: ['budget', selectedMonth, selectedYear],
        queryFn: () => budgetApi.getBudget(selectedMonth, selectedYear),
    });

    const budgetExists = budgetData?.data?.success === true;

    // Initialize rows from fetched data
    useEffect(() => {
        if (budgetData?.data?.success) {
            const bd = budgetData.data; // bd is BudgetResponse

            // Helper to map API rows to local rows
            const mapRows = (rows: BudgetRowResponse[], group: string): LocalBudgetRow[] => {
                return rows.map((r, i) => ({
                    id: `${group}-${i}-${Date.now()}`,
                    group,
                    name: r.name,
                    amount: r.amount,
                    include_in_total: r.include_in_total,
                    category_id: r.category_id,
                    actual: r.actual_amount,
                    diff: r.difference_pct,
                }));
            };

            // Set rows if they exist
            setIncomeRows(mapRows(bd.income_rows, 'income'));
            setExpenseRows(mapRows(bd.expense_rows, 'expense'));
            setSavingsRows(mapRows(bd.savings_rows, 'saving'));
            setInvestmentRows(mapRows(bd.investment_rows, 'investment'));

        } else if (!isLoading && !budgetData) {
            // Reset to empty if not found
            setIncomeRows([]);
            setExpenseRows([]);
            setSavingsRows([]);
            setInvestmentRows([]);
        }
    }, [budgetData, isLoading]);

    // Handle specific 404 error
    useEffect(() => {
        if (error) {
            setIncomeRows([]);
            setExpenseRows([]);
            setSavingsRows([]);
            setInvestmentRows([]);
        }
    }, [error]);

    const createEmptyRow = (group: string): LocalBudgetRow => ({
        id: `${group}-${Date.now()}-${Math.random()}`,
        group,
        name: '',
        amount: 0,
        include_in_total: true,
        category_id: null,
    });

    const addRow = (group: string) => {
        const newRow = createEmptyRow(group);
        if (group === 'income') setIncomeRows([...incomeRows, newRow]);
        if (group === 'expense') setExpenseRows([...expenseRows, newRow]);
        if (group === 'saving') setSavingsRows([...savingsRows, newRow]);
        if (group === 'investment') setInvestmentRows([...investmentRows, newRow]);
    };

    const removeRow = (group: string, id: string) => {
        if (group === 'income') setIncomeRows(incomeRows.filter(r => r.id !== id));
        if (group === 'expense') setExpenseRows(expenseRows.filter(r => r.id !== id));
        if (group === 'saving') setSavingsRows(savingsRows.filter(r => r.id !== id));
        if (group === 'investment') setInvestmentRows(investmentRows.filter(r => r.id !== id));
    };

    const updateRow = (group: string, id: string, field: keyof LocalBudgetRow, value: string | number | boolean | null) => {
        const update = (rows: LocalBudgetRow[]) =>
            rows.map(r => r.id === id ? { ...r, [field]: value } : r);

        if (group === 'income') setIncomeRows(update(incomeRows));
        if (group === 'expense') setExpenseRows(update(expenseRows));
        if (group === 'saving') setSavingsRows(update(savingsRows));
        if (group === 'investment') setInvestmentRows(update(investmentRows));
    };

    // Calculations
    const calculateTotal = (rows: LocalBudgetRow[]) =>
        rows.filter(r => r.include_in_total).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const totalIncome = calculateTotal(incomeRows);
    const totalExpenses = calculateTotal(expenseRows);
    const totalSavings = calculateTotal(savingsRows);
    const totalInvestments = calculateTotal(investmentRows);

    const remainingBudget = totalIncome - totalExpenses - totalSavings - totalInvestments;
    const remainingBudgetPct = totalIncome > 0 ? (remainingBudget / totalIncome) * 100 : 0;

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const plan: BudgetPlan = {
                rows: [
                    ...incomeRows,
                    ...expenseRows,
                    ...savingsRows,
                    ...investmentRows
                ].map(({ id, actual, diff, ...rest }) => ({
                    ...rest,
                    amount: Number(rest.amount),
                    group: rest.group,
                }))
            };

            try {
                return await budgetApi.updateBudget(selectedMonth, selectedYear, plan);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    return await budgetApi.createBudget(selectedMonth, selectedYear, plan);
                }
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', selectedMonth, selectedYear] });
            toast({ title: 'Budget saved successfully' });
            setIsEditing(false); // Exit edit mode
        },
        onError: (err: Error | ApiError) => {
            const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to save budget';
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: () => budgetApi.deleteBudget(selectedMonth, selectedYear),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', selectedMonth, selectedYear] });
            toast({ title: 'Budget deleted successfully' });
            setIsEditing(false);
            // Reset to empty state manually or let useEffect handle it after refetch
        },
        onError: (err: Error | ApiError) => {
            const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to delete budget';
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        }
    });

    // Copy Mutation
    const copyMutation = useMutation({
        mutationFn: async () => {
            const plan: BudgetPlan = {
                rows: [
                    ...incomeRows,
                    ...expenseRows,
                    ...savingsRows,
                    ...investmentRows
                ].map(({ id, actual, diff, ...rest }) => ({
                    ...rest,
                    amount: Number(rest.amount),
                    group: rest.group,
                }))
            };

            // Use upsert logic for target month
            try {
                return await budgetApi.updateBudget(copyTargetMonth, copyTargetYear, plan);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    return await budgetApi.createBudget(copyTargetMonth, copyTargetYear, plan);
                }
                throw error;
            }
        },
        onSuccess: () => {
            // Invalidate target budget queries
            queryClient.invalidateQueries({ queryKey: ['budget', copyTargetMonth, copyTargetYear] });
            toast({ title: `Budget copied to ${MONTHS[copyTargetMonth - 1]} ${copyTargetYear}` });
            setIsCopyOpen(false);
        },
        onError: (err: Error | ApiError) => {
            const message = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : 'Failed to copy budget';
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        }
    });


    const toggleSection = (group: string) => {
        setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const renderSection = (title: string, group: string, rows: LocalBudgetRow[]) => {
        const total = calculateTotal(rows);
        const pctOfIncome = totalIncome > 0 ? (total / totalIncome) * 100 : 0;
        const isOpen = openSections[group];

        return (
            <Collapsible open={isOpen} onOpenChange={() => toggleSection(group)} className="mb-6">
                <Card className="border-none shadow-none bg-transparent">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleSection(group)}>
                            <div className={cn("p-1 rounded-md transition-colors text-muted-foreground/50 group-hover:text-primary", isOpen ? "rotate-90" : "")}>
                                <ChevronRight className="h-5 w-5 transition-transform" />
                            </div>
                            <div className="flex items-baseline gap-4">
                                <h2 className="text-2xl font-display font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">{title}</h2>
                                <span className="text-xl font-mono font-medium tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                                    {formatCurrency(total)}
                                    <span className="text-sm font-sans font-normal text-muted-foreground/60 ml-2">
                                        ({pctOfIncome.toFixed(1)}%)
                                    </span>
                                </span>
                            </div>
                        </div>

                        {isEditing && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); addRow(group); }} className="text-primary hover:text-primary/90 hover:bg-primary/10">
                                <Plus className="h-4 w-4 mr-1" /> Add Row
                            </Button>
                        )}
                    </div>

                    <CollapsibleContent>
                        <CardContent className="px-0 py-2">
                            {rows.length === 0 ? (
                                <div className="px-6 py-8 text-center text-muted-foreground text-sm italic bg-muted/30 rounded-xl border border-dashed border-border/50">
                                    No items in this section. {isEditing && "Click 'Add Row' to start."}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b border-border/50">
                                            <TableHead className="w-[30%] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Name</TableHead>
                                            <TableHead className="w-[20%] text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Category</TableHead>
                                            <TableHead className="w-[15%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Planned</TableHead>
                                            <TableHead className="w-[15%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Actual</TableHead>
                                            <TableHead className="w-[10%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Diff</TableHead>
                                            <TableHead className="w-[5%] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/40" title="Include in Total">Inc.</TableHead>
                                            {isEditing && <TableHead className="w-[5%] pr-4"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-muted/40 border-b border-border/30 transition-colors group/row">
                                                <TableCell className="pl-4 py-2 font-medium">
                                                    {isEditing ? (
                                                        <Input
                                                            value={row.name}
                                                            onChange={(e) => updateRow(group, row.id, 'name', e.target.value)}
                                                            placeholder="Item name"
                                                            className="h-9 bg-background/50 border-input/50 focus:bg-background"
                                                        />
                                                    ) : (
                                                        <span className="text-foreground text-base">{row.name}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    {isEditing ? (
                                                        <Select
                                                            value={row.category_id !== null ? row.category_id.toString() : "none"}
                                                            onValueChange={(val) => updateRow(group, row.id, 'category_id', val === "none" ? null : parseInt(val))}
                                                        >
                                                            <SelectTrigger className="h-9 bg-background/50 border-input/50 focus:bg-background">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">None</SelectItem>
                                                                {categories.filter(c => {
                                                                    if (group === 'income') return c.type === 'income';
                                                                    if (group === 'expense') return c.type === 'expense';
                                                                    if (group === 'saving') return c.type === 'saving';
                                                                    if (group === 'investment') return c.type === 'investment';
                                                                    return true;
                                                                }).map(c => (
                                                                    <SelectItem key={c.categories_id_pk} value={c.categories_id_pk.toString()}>
                                                                        {c.category_name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            {row.category_id && categories.find(c => c.categories_id_pk === row.category_id)?.category_name || '-'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right py-2 font-mono">
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            value={row.amount}
                                                            onChange={(e) => updateRow(group, row.id, 'amount', parseFloat(e.target.value) || 0)}
                                                            className="h-9 text-right font-mono bg-background/50 border-input/50 focus:bg-background"
                                                        />
                                                    ) : (
                                                        <span className="text-foreground font-medium">{formatCurrency(row.amount)}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right py-2 font-mono font-medium">
                                                    {row.actual != null ? (
                                                        <span className="text-muted-foreground">
                                                            {formatCurrency(row.actual)}
                                                        </span>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right py-2 font-mono text-sm">
                                                    {row.diff != null ? (
                                                        <span className={cn(
                                                            "opacity-80",
                                                            row.diff > 0 ? "text-success" : row.diff < 0 ? "text-destructive" : "text-muted-foreground"
                                                        )}>
                                                            {row.diff > 0 ? '+' : ''}{Number(row.diff).toFixed(0)}%
                                                        </span>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    {isEditing ? (
                                                        <div className="flex justify-center">
                                                            <Checkbox
                                                                checked={row.include_in_total}
                                                                onCheckedChange={(checked) => updateRow(group, row.id, 'include_in_total', checked)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            {row.include_in_total && (
                                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                {isEditing && (
                                                    <TableCell className="pr-4 py-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 hover:text-destructive transition-colors" onClick={() => removeRow(group, row.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-32">
            <PageHeader
                title="Budget Maker"
                description="Plan your monthly income, expenses, and savings goals."
                actions={
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                {budgetExists && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Budget
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete your budget plan for {MONTHS[selectedMonth - 1]} {selectedYear}.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditing(false);
                                        queryClient.invalidateQueries({ queryKey: ['budget', selectedMonth, selectedYear] }); // Reset changes
                                        toast({ title: "Changes discarded" });
                                    }}
                                >
                                    <X className="mr-2 h-4 w-4" /> Cancel
                                </Button>
                                <Button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={saveMutation.isPending}
                                    className="bg-primary hover:bg-primary/90 transition-all shadow-md"
                                >
                                    {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Budget
                                </Button>
                            </>
                        ) : (
                            <>
                                <Dialog open={isCopyOpen} onOpenChange={setIsCopyOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Copy className="mr-2 h-4 w-4" /> Copy to...
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Copy Budget Plan</DialogTitle>
                                            <DialogDescription>
                                                Copy the current budget plan ({MONTHS[selectedMonth - 1]} {selectedYear}) to another month.
                                                This will overwrite any existing budget in the selected target month.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex gap-4 py-4">
                                            <div className="flex flex-col gap-1.5 flex-1">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Target Month</Label>
                                                <Select value={copyTargetMonth.toString()} onValueChange={(val) => setCopyTargetMonth(parseInt(val))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MONTHS.map((m, i) => (
                                                            <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-1.5 w-1/3">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Target Year</Label>
                                                <Select value={copyTargetYear.toString()} onValueChange={(val) => setCopyTargetYear(parseInt(val))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[...Array(5)].map((_, i) => {
                                                            const y = new Date().getFullYear() - 1 + i;
                                                            return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsCopyOpen(false)}>Cancel</Button>
                                            <Button onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending}>
                                                {copyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Copy Budget
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-gradient-blurple hover:opacity-90 transition-all shadow-md"
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Budget
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            {/* Date Selectors */}
            <div className="flex gap-4 mb-4 bg-card p-4 rounded-xl border border-border shadow-sm w-fit transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Month</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                        <SelectTrigger className="w-[140px] border-transparent bg-muted/50 focus:bg-background hover:bg-background transition-colors font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                        <SelectTrigger className="w-[100px] border-transparent bg-muted/50 focus:bg-background hover:bg-background transition-colors font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() + i - 2;
                                return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                >
                    {renderSection('Income', 'income', incomeRows)}
                    {renderSection('Expenses', 'expense', expenseRows)}
                    {renderSection('Savings', 'saving', savingsRows)}
                    {renderSection('Investments', 'investment', investmentRows)}

                    {/* Summary Card */}
                    <AnimatePresence>
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 right-6 z-50"
                        >
                            <Card className="shadow-2xl border-primary/20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 dark:border-primary/40 dark:shadow-primary/5">
                                <CardHeader className="py-4 px-6 flex flex-row items-center gap-6 space-y-0">
                                    <div>
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                            Remaining Planned Budget
                                        </CardTitle>
                                        <div className={cn("text-3xl font-bold font-mono tracking-tight", remainingBudget >= 0 ? "text-foreground" : "text-destructive")}>
                                            {formatCurrency(remainingBudget)}
                                            <span className="text-sm ml-2 font-normal text-muted-foreground select-none">
                                                ({remainingBudgetPct.toFixed(1)}%)
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