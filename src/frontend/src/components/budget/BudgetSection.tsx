import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { ChevronRight, GripVertical, Trash2 } from 'lucide-react';
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
import { budgetMoney, isRowInvalid, parseAmount, rowDelta, type BudgetGroup, type LocalBudgetRow } from './budget-rows';

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

// Desktop column template, shared by the column header, section rows and item rows so they line up.
// handle | item | linked to | plan | actual | difference | total toggle | remove
const GRID = 'lg:grid lg:grid-cols-[1.25rem_minmax(0,1.2fr)_minmax(0,1.4fr)_8.25rem_6.5rem_7.75rem_2.75rem_2rem] lg:items-center lg:gap-x-3';

/** True from the `lg` breakpoint up. Only one row layout is rendered, so the drag activator exists once. */
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (cb: () => void) => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
};
const useIsDesktop = () => useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => true);

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const includedTotal = (rows: LocalBudgetRow[], pick: (r: LocalBudgetRow) => number | null) =>
    rows.filter(r => r.include_in_total).reduce((sum, r) => sum + (pick(r) ?? 0), 0);

/** Column labels, drawn once above the sections (desktop only). */
export function BudgetColumnHeader() {
    const { t } = useUser();
    return (
        <div className={cn('hidden border-b border-border pb-2.5 text-[0.8125rem] text-muted-foreground', GRID)}>
            <span />
            <span>{t('pages.budgetMaker.item')}</span>
            <span>{t('pages.budgetMaker.filters')}</span>
            <span className="text-right">{t('metrics.planned')}</span>
            <span className="text-right">{t('metrics.actual')}</span>
            <span className="text-right">{t('metrics.diff')}</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-help text-center">{t('pages.budgetMaker.includeShort')}</span>
                </TooltipTrigger>
                <TooltipContent>{t('metrics.includeInTotal')}</TooltipContent>
            </Tooltip>
            <span />
        </div>
    );
}

export function BudgetSection(props: SectionProps) {
    const { title, group, rows, totalIncome, open, onOpenChange, onAdd, onReorder } = props;
    const { formatNumber, currency, t } = useUser();
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
    const pctOfIncome = totalIncome > 0 ? planned / totalIncome : 0;
    const actualOver = group === 'expense' && actual > trackedPlanned;

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

    const addButton = (
        <button
            type="button"
            onClick={add}
            className="rounded text-[0.84375rem] text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            + {t('pages.budgetMaker.addRow')}
        </button>
    );

    return (
        <Collapsible open={open} onOpenChange={onOpenChange} className="mt-9 first:mt-4">
            <div className={cn('items-center border-b border-foreground/20 pb-2 text-[0.9375rem] font-medium', GRID, 'max-lg:flex max-lg:justify-between max-lg:gap-3')}>
                <h2 className="min-w-0 lg:col-span-3">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="group flex items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <ChevronRight
                                className={cn('h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:text-foreground', open && 'rotate-90')}
                                aria-hidden="true"
                            />
                            <span>{title}</span>
                            {group !== 'income' && totalIncome > 0 && (
                                <span className="text-[0.8125rem] font-normal tabular-nums text-muted-foreground">
                                    <SensitiveValue>{formatNumber(pctOfIncome, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })}</SensitiveValue>
                                </span>
                            )}
                        </button>
                    </CollapsibleTrigger>
                </h2>
                <span className="flex items-baseline gap-4 tabular-nums max-lg:shrink-0 lg:contents">
                    <span className="text-right">
                        <SensitiveValue>{budgetMoney(planned, currency)}</SensitiveValue>
                    </span>
                    <span className={cn('text-right', actualOver && 'text-destructive')}>
                        {tracked.length > 0 && (
                            <>
                                <span className="mr-1.5 text-[0.75rem] font-normal text-muted-foreground lg:hidden">{t('metrics.actual')}</span>
                                <SensitiveValue>{budgetMoney(actual, currency)}</SensitiveValue>
                            </>
                        )}
                    </span>
                </span>
            </div>

            <CollapsibleContent>
                {rows.length === 0 ? (
                    <div className="flex flex-wrap items-baseline gap-x-3 py-2.5 text-[0.84375rem] text-muted-foreground lg:pl-8">
                        <span>{t('pages.budgetMaker.noItems')}</span>
                        {addButton}
                    </div>
                ) : (
                    <>
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
                        <div className="pt-2.5 lg:pl-8">{addButton}</div>
                    </>
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
    const isDesktop = useIsDesktop();
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
    // The name input renders twice (desktop + mobile layouts); focus whichever is visible.
    const nameRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (autoFocus) nameRefs.current.find(el => el && el.offsetParent !== null)?.focus();
    }, [autoFocus]);

    const invalid = isRowInvalid(row);
    const nameInvalid = invalid && row.name.trim() === '';
    const amountInvalid = invalid && !nameInvalid;

    const handle = (
        <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t('pages.budgetMaker.dragToReorder')}
            className="flex h-8 w-5 cursor-grab max-lg:h-10 max-lg:w-6 touch-none items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
    );

    const renderName = (slot: number) => (
        <Input
            ref={(el) => { nameRefs.current[slot] = el; }}
            value={row.name}
            onChange={(e) => onUpdate(row.id, { name: e.target.value })}
            placeholder={t('pages.budgetMaker.itemName')}
            aria-label={t('pages.budgetMaker.itemName')}
            aria-invalid={nameInvalid || undefined}
            className={cn(GHOST_INPUT, 'text-[0.9375rem]')}
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
            className="h-8 w-8 max-lg:h-10 max-lg:w-10 text-muted-foreground/50 hover:text-destructive lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover/row:opacity-100"
            onClick={() => onRemove(row.id)}
        >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
    );

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn(
                'group/row relative border-b border-border transition-colors',
                isDragging && 'z-10 border-transparent bg-background shadow-lg ring-1 ring-border',
            )}
        >
            {isDesktop ? (
            <div className={cn('py-1.5', GRID)}>
                {handle}
                {renderName(0)}
                <div className="min-w-0 overflow-hidden">{filters}</div>
                {amount}
                <ActualCell row={row} />
                <DiffCell row={row} group={group} />
                <div className="flex justify-center">{include}</div>
                {remove}
            </div>
            ) : (
            /* Mobile: stacked rows separated by hairlines */
            <div className="space-y-1.5 py-3">
                <div className="flex items-center gap-1">
                    {handle}
                    <div className="min-w-0 flex-1">{renderName(1)}</div>
                    {remove}
                </div>
                <div className="pl-7">{filters}</div>
                <div className="flex flex-wrap items-end gap-x-5 gap-y-2 pl-7">
                    <div className="w-[8.5rem] space-y-0.5">
                        <span className="block text-[0.75rem] text-muted-foreground">{t('metrics.planned')}</span>
                        {amount}
                    </div>
                    <div className="space-y-0.5">
                        <span className="block text-right text-[0.75rem] text-muted-foreground">{t('metrics.actual')}</span>
                        <ActualCell row={row} />
                    </div>
                    <div className="space-y-0.5">
                        <span className="block text-right text-[0.75rem] text-muted-foreground">{t('metrics.diff')}</span>
                        <DiffCell row={row} group={group} />
                    </div>
                </div>
                <label className="flex items-center gap-2 pl-7 pt-1 text-[0.8125rem] text-muted-foreground">
                    {include}
                    {t('metrics.includeInTotal')}
                </label>
            </div>
            )}
        </div>
    );
}

// Item names sit on no line until hovered; focus and invalid styling come from Input's own fieldLine.
const GHOST_INPUT = 'h-9 border-b-transparent hover:border-foreground/40';

/**
 * Text input (not type=number: no scroll-wheel surprises, accepts "1 234,50"); shows formatted
 * currency when idle. Always on a hairline: this is the column that gets typed in.
 * Enter moves to the next row's plan field.
 */
function AmountInput({ value, invalid, onChange }: { value: string; invalid: boolean; onChange: (v: string) => void }) {
    const { currency, t } = useUser();
    const { isPrivacyMode } = usePrivacyMode();
    const [focused, setFocused] = useState(false);
    const n = parseAmount(value);
    const display = !focused && !invalid && Number.isFinite(n) ? budgetMoney(n, currency) : value;

    const focusNext = (input: HTMLInputElement) => {
        const root = input.closest('[data-budget-table]');
        if (!root) return;
        const all = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-plan-input]')).filter(el => el.offsetParent !== null);
        all[all.indexOf(input) + 1]?.focus();
    };

    return (
        <Input
            inputMode="decimal"
            autoComplete="off"
            data-plan-input=""
            value={display}
            placeholder="0"
            aria-label={t('metrics.planned')}
            onFocus={(e) => {
                setFocused(true);
                const el = e.target;
                requestAnimationFrame(() => el.select());
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                e.preventDefault();
                focusNext(e.currentTarget);
            }}
            aria-invalid={invalid || undefined}
            className={cn('h-9 text-right text-[0.96875rem] tabular-nums', isPrivacyMode && !focused && 'blur-[6px]')}
        />
    );
}

function ActualCell({ row }: { row: LocalBudgetRow }) {
    const { currency, t } = useUser();

    if (row.actual == null) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="block cursor-help text-right text-[0.90625rem] text-muted-foreground/50">–</span>
                </TooltipTrigger>
                <TooltipContent>{t('pages.budgetMaker.noActualHint')}</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <SensitiveValue className="block whitespace-nowrap text-right text-[0.90625rem] text-muted-foreground">
            {budgetMoney(row.actual, currency)}
        </SensitiveValue>
    );
}

/**
 * Actual minus plan, as an amount. Only an expense over plan gets colour (and the word "over");
 * more income, savings or investing than planned is green; everything else is muted.
 */
function DiffCell({ row, group }: { row: LocalBudgetRow; group: BudgetGroup }) {
    const { currency, t } = useUser();
    const delta = rowDelta(row);
    if (delta == null) return <span className="block whitespace-nowrap text-right text-[0.90625rem] text-muted-foreground/50">–</span>;

    const zeroText = budgetMoney(0, currency);
    const absText = budgetMoney(Math.abs(delta), currency);
    // An amount that displays as nothing is nothing: no "+0", no red zero.
    const zero = Math.abs(delta) < 0.005 || absText === zeroText;
    const amount = zero ? zeroText : `${delta > 0 ? '+' : '−'}${absText}`;
    const over = !zero && group === 'expense' && delta > 0;
    const favourable = !zero && group !== 'expense' && delta > 0;
    // Earning less than planned is bad news; savings and investing shortfalls stay quiet.
    const incomeShort = !zero && group === 'income' && delta < 0;

    return (
        <SensitiveValue className={cn(
            'block whitespace-nowrap text-right text-[0.90625rem]',
            over || incomeShort ? 'text-destructive' : favourable ? 'text-success' : 'text-muted-foreground',
        )}>
            {over ? t('pages.budgetMaker.overAmount', { amount }) : amount}
        </SensitiveValue>
    );
}
