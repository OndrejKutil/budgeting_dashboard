import { useEffect, useRef, useState } from 'react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type Modifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import type { Category, Tag } from '@/lib/api/types/base';
import { BudgetRowFilters } from './BudgetRowFilters';
import { isRowInvalid, parseAmount, type BudgetGroup, type LocalBudgetRow } from './budget-rows';

export type RowPatch = Partial<Pick<LocalBudgetRow, 'name' | 'amount' | 'include_in_total' | 'category_ids' | 'tags'>>;

interface SectionProps {
    title: string;
    group: BudgetGroup;
    rows: LocalBudgetRow[];
    totalIncome: number;
    categories: Category[];
    tags: Tag[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: () => string; // returns the new row id so we can focus it
    onUpdate: (id: string, patch: RowPatch) => void;
    onRemove: (id: string) => void;
    onReorder: (rows: LocalBudgetRow[]) => void;
}

// Desktop column template, shared by header and rows so they line up.
const GRID = 'md:grid md:grid-cols-[20px_minmax(0,1.3fr)_minmax(0,1.5fr)_120px_minmax(130px,1fr)_56px_40px_32px] md:items-center md:gap-x-3';

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const includedTotal = (rows: LocalBudgetRow[], pick: (r: LocalBudgetRow) => number | null) =>
    rows.filter(r => r.include_in_total).reduce((sum, r) => sum + (pick(r) ?? 0), 0);

export function BudgetSection(props: SectionProps) {
    const { title, group, rows, totalIncome, open, onOpenChange, onAdd, onReorder } = props;
    const { formatCurrency, t } = useUser();
    const [focusId, setFocusId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const planned = includedTotal(rows, r => {
        const n = parseAmount(r.amount);
        return Number.isFinite(n) ? n : 0;
    });
    const tracked = rows.filter(r => r.include_in_total && r.actual != null);
    const actual = includedTotal(tracked, r => r.actual);
    const trackedPlanned = includedTotal(tracked, r => parseAmount(r.amount) || 0);
    const pctOfIncome = totalIncome > 0 ? (planned / totalIncome) * 100 : 0;

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = rows.findIndex(r => r.id === active.id);
        const to = rows.findIndex(r => r.id === over.id);
        if (from !== -1 && to !== -1) onReorder(arrayMove(rows, from, to));
    };

    const add = () => {
        onOpenChange(true);
        setFocusId(onAdd());
    };

    return (
        <Collapsible open={open} onOpenChange={onOpenChange} className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-2 px-2">
                <h2 className="min-w-0">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center gap-3 text-left rounded-md group ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <span className={cn('inline-flex p-1 rounded-md transition-transform text-muted-foreground/50 group-hover:text-primary', open && 'rotate-90')}>
                                <ChevronRight className="h-5 w-5" />
                            </span>
                            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                                <span className="text-2xl font-display font-bold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">{title}</span>
                                <span className="text-xl font-mono font-medium tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                                    <SensitiveValue>{formatCurrency(planned)}</SensitiveValue>
                                    {group !== 'income' && (
                                        <span className="text-sm font-sans font-normal text-muted-foreground/60 ml-2">
                                            (<SensitiveValue>{pctOfIncome.toFixed(1)}%</SensitiveValue>)
                                        </span>
                                    )}
                                </span>
                                {tracked.length > 0 && (
                                    <span className={cn(
                                        'text-sm font-normal text-muted-foreground',
                                        group === 'expense' && actual > trackedPlanned && 'text-destructive',
                                    )}>
                                        {t('metrics.actual')} <SensitiveValue className="font-mono">{formatCurrency(actual)}</SensitiveValue>
                                    </span>
                                )}
                            </span>
                        </button>
                    </CollapsibleTrigger>
                </h2>
                <Button variant="ghost" size="sm" onClick={add} className="shrink-0 text-primary hover:text-primary/90 hover:bg-primary/10">
                    <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t('pages.budgetMaker.addRow')}</span>
                </Button>
            </div>

            <CollapsibleContent>
                {rows.length === 0 ? (
                    <button
                        type="button"
                        onClick={add}
                        className="w-full px-6 py-6 text-center text-muted-foreground text-sm bg-muted/30 rounded-xl border border-dashed border-border/50 hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                        {t('pages.budgetMaker.noItems')} <span className="text-primary">{t('pages.budgetMaker.addRowHint')}</span>
                    </button>
                ) : (
                    <div className="space-y-2 md:space-y-0">
                        <div className={cn('hidden px-2 pb-2 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50', GRID)}>
                            <span />
                            <span className="pl-2">{t('common.name')}</span>
                            <span>{t('pages.budgetMaker.filters')}</span>
                            <span className="text-right pr-2">{t('metrics.planned')}</span>
                            <span className="text-right">{t('metrics.actual')}</span>
                            <span className="text-right">{t('metrics.diff')}</span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-center cursor-help">{t('pages.budgetMaker.includeShort')}</span>
                                </TooltipTrigger>
                                <TooltipContent>{t('metrics.includeInTotal')}</TooltipContent>
                            </Tooltip>
                            <span />
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={handleDragEnd}>
                            <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                {rows.map(row => (
                                    <SortableRow
                                        key={row.id}
                                        row={row}
                                        {...props}
                                        autoFocus={row.id === focusId}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

interface RowProps extends SectionProps {
    row: LocalBudgetRow;
    autoFocus: boolean;
}

function SortableRow({ row, group, categories, tags, onUpdate, onRemove, autoFocus }: RowProps) {
    const { t } = useUser();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
    // The name input renders twice (desktop + mobile layouts); focus whichever is visible.
    const nameRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (autoFocus) nameRefs.current.find(el => el && el.offsetParent !== null)?.focus();
    }, [autoFocus]);

    const invalid = isRowInvalid(row);
    const nameInvalid = invalid && row.name.trim() === '';
    const amountInvalid = invalid && !nameInvalid;
    const overBudget = group === 'expense' && row.actual != null && row.actual > (parseAmount(row.amount) || 0);

    const handle = (
        <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t('pages.budgetMaker.dragToReorder')}
            className="flex h-8 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
        >
            <GripVertical className="h-4 w-4" />
        </button>
    );

    const renderName = (slot: number) => (
        <Input
            ref={(el) => { nameRefs.current[slot] = el; }}
            value={row.name}
            onChange={(e) => onUpdate(row.id, { name: e.target.value })}
            placeholder={t('pages.budgetMaker.itemName')}
            aria-invalid={nameInvalid || undefined}
            className={cn(GHOST_INPUT, 'font-medium', nameInvalid && INVALID)}
        />
    );

    const filters = (
        <BudgetRowFilters
            group={group}
            categoryIds={row.category_ids}
            tagIds={row.tags}
            categories={categories}
            tags={tags}
            onChange={(patch) => onUpdate(row.id, patch)}
        />
    );

    const amount = (
        <AmountInput
            value={row.amount}
            invalid={amountInvalid}
            onChange={(v) => onUpdate(row.id, { amount: v })}
        />
    );

    const include = (
        <Checkbox
            checked={row.include_in_total}
            onCheckedChange={(checked) => onUpdate(row.id, { include_in_total: checked === true })}
            aria-label={t('metrics.includeInTotal')}
        />
    );

    const remove = (
        <Button
            variant="ghost"
            size="icon"
            aria-label={t('pages.budgetMaker.removeRow')}
            className="h-8 w-8 text-muted-foreground/40 hover:text-destructive md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
            onClick={() => onRemove(row.id)}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    );

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn(
                'group/row relative rounded-xl border border-border/50 bg-card/50 md:rounded-none md:border-0 md:border-b md:border-border/30 md:bg-transparent transition-colors',
                'hover:bg-muted/40 focus-within:bg-muted/30',
                overBudget && 'bg-destructive/[0.04] md:bg-destructive/[0.04]',
                isDragging && 'z-10 shadow-lg bg-card md:bg-card ring-1 ring-border',
            )}
        >
            {/* Desktop */}
            <div className={cn('hidden px-2 py-1.5', GRID)}>
                {handle}
                {renderName(0)}
                <div className="min-w-0">{filters}</div>
                {amount}
                <ActualCell row={row} group={group} />
                <DiffCell row={row} group={group} />
                <div className="flex justify-center">{include}</div>
                {remove}
            </div>

            {/* Mobile */}
            <div className="md:hidden p-3 space-y-2">
                <div className="flex items-center gap-1">
                    {handle}
                    <div className="flex-1 min-w-0">{renderName(1)}</div>
                    {remove}
                </div>
                <div className="pl-6">{filters}</div>
                <div className="pl-6 grid grid-cols-[1fr_auto] items-end gap-3">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">{t('metrics.planned')}</span>
                        {amount}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">{t('metrics.actual')}</span>
                        <div className="flex items-baseline gap-2">
                            <ActualCell row={row} group={group} compact />
                            <DiffCell row={row} group={group} />
                        </div>
                    </div>
                </div>
                <label className="pl-6 flex items-center gap-2 text-xs text-muted-foreground">
                    {include}
                    {t('metrics.includeInTotal')}
                </label>
            </div>
        </div>
    );
}

const GHOST_INPUT = 'h-8 px-2 border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-offset-0';
const INVALID = 'border-destructive/60 hover:border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40';

/** Text input (not type=number: no scroll-wheel surprises, accepts "1 234,50"); shows formatted currency when idle. */
function AmountInput({ value, invalid, onChange }: { value: string; invalid: boolean; onChange: (v: string) => void }) {
    const { formatCurrency } = useUser();
    const { isPrivacyMode } = usePrivacyMode();
    const [focused, setFocused] = useState(false);
    const n = parseAmount(value);
    const display = !focused && !invalid && Number.isFinite(n) ? formatCurrency(n) : value;

    return (
        <Input
            inputMode="decimal"
            autoComplete="off"
            value={display}
            placeholder="0"
            onFocus={(e) => { setFocused(true); requestAnimationFrame(() => e.target.select()); }}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={invalid || undefined}
            className={cn(GHOST_INPUT, 'text-right font-mono tabular-nums', invalid && INVALID, isPrivacyMode && !focused && 'blur-[6px]')}
        />
    );
}

function ActualCell({ row, group, compact = false }: { row: LocalBudgetRow; group: BudgetGroup; compact?: boolean }) {
    const { formatCurrency, t } = useUser();

    if (row.actual == null) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="block text-right text-sm text-muted-foreground/40 cursor-help">–</span>
                </TooltipTrigger>
                <TooltipContent>{t('pages.budgetMaker.noActualHint')}</TooltipContent>
            </Tooltip>
        );
    }

    const planned = parseAmount(row.amount) || 0;
    const ratio = planned > 0 ? row.actual / planned : row.actual > 0 ? Infinity : 0;
    const barColor = group === 'expense'
        ? (ratio > 1 ? 'bg-destructive' : ratio > 0.9 ? 'bg-warning' : 'bg-primary/70')
        : (ratio >= 1 ? 'bg-success' : 'bg-primary/70');

    return (
        <div className={cn('flex flex-col items-end gap-1', !compact && 'w-full')}>
            <SensitiveValue className="font-mono text-sm font-medium text-muted-foreground">{formatCurrency(row.actual)}</SensitiveValue>
            {!compact && (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden" role="presentation">
                    <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
                </div>
            )}
        </div>
    );
}

function DiffCell({ row, group }: { row: LocalBudgetRow; group: BudgetGroup }) {
    if (row.diff == null) return <span className="block text-right text-sm text-muted-foreground/40">–</span>;
    const good = group === 'expense' ? row.diff <= 0 : row.diff >= 0;
    return (
        <SensitiveValue className={cn(
            'block text-right font-mono text-sm',
            row.diff === 0 ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive',
        )}>
            {row.diff > 0 ? '+' : ''}{Number(row.diff).toFixed(0)}%
        </SensitiveValue>
    );
}
