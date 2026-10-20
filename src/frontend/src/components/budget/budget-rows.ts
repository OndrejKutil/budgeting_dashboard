import type { BudgetPlan, BudgetPlanRow } from '@/lib/api/types/requests';
import type { BudgetResponse, BudgetRowResponse } from '@/lib/api/types/responses';

export const BUDGET_GROUPS = ['income', 'expense', 'saving', 'investment'] as const;
export type BudgetGroup = (typeof BUDGET_GROUPS)[number];

export interface LocalBudgetRow {
    id: string; // client-only, stable across reorders (React key + dnd id)
    group: BudgetGroup;
    name: string;
    amount: string; // raw input text; parsed on save so "12,5" or "" don't fight the cursor
    include_in_total: boolean;
    category_ids: number[];
    tags: number[];
    actual: number | null;
    diff: number | null;
}

export type RowsByGroup = Record<BudgetGroup, LocalBudgetRow[]>;

export const emptyRows = (): RowsByGroup => ({ income: [], expense: [], saving: [], investment: [] });

let idCounter = 0;
export const newRowId = () => `row-${Date.now()}-${idCounter++}`;

export const createEmptyRow = (group: BudgetGroup): LocalBudgetRow => ({
    id: newRowId(),
    group,
    name: '',
    amount: '',
    include_in_total: true,
    category_ids: [],
    tags: [],
    actual: null,
    diff: null,
});

const RESPONSE_KEYS: Record<BudgetGroup, keyof Pick<BudgetResponse, 'income_rows' | 'expense_rows' | 'savings_rows' | 'investment_rows'>> = {
    income: 'income_rows',
    expense: 'expense_rows',
    saving: 'savings_rows',
    investment: 'investment_rows',
};

// Backend Decimals arrive as JSON strings ("1234.50") despite the number typing; coerce so sums don't concatenate.
const toNumber = (v: number | string | null | undefined): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const fromResponseRow = (r: BudgetRowResponse, group: BudgetGroup): LocalBudgetRow => ({
    id: newRowId(),
    group,
    name: r.name,
    amount: String(r.amount),
    include_in_total: r.include_in_total,
    category_ids: r.category_ids ?? [],
    tags: r.tags ?? [],
    actual: toNumber(r.actual_amount),
    diff: toNumber(r.difference_pct),
});

export const rowsFromResponse = (bd: BudgetResponse): RowsByGroup => {
    const rows = emptyRows();
    for (const g of BUDGET_GROUPS) rows[g] = (bd[RESPONSE_KEYS[g]] ?? []).map(r => fromResponseRow(r, g));
    return rows;
};

/** Copy a plan into fresh rows (new ids, no actuals) — for "copy from previous month". */
export const cloneRowsForNewMonth = (bd: BudgetResponse): RowsByGroup => {
    const rows = rowsFromResponse(bd);
    for (const g of BUDGET_GROUPS) rows[g] = rows[g].map(r => ({ ...r, actual: null, diff: null }));
    return rows;
};

export const countRows = (rows: RowsByGroup) => BUDGET_GROUPS.reduce((n, g) => n + rows[g].length, 0);

/** Accepts "1 234,50" as well as "1234.5". Empty → 0. Garbage → NaN. */
export const parseAmount = (raw: string): number => {
    const s = raw.replace(/\s/g, '').replace(',', '.');
    if (s === '') return 0;
    return Number(s);
};

const isBlankDraft = (r: LocalBudgetRow) =>
    r.name.trim() === '' && parseAmount(r.amount) === 0 && r.category_ids.length === 0 && r.tags.length === 0;

/** Mirrors backend BudgetPlanRow validation: name 1..255 chars, amount >= 0. */
export const isRowInvalid = (r: LocalBudgetRow) => {
    if (isBlankDraft(r)) return false;
    const amount = parseAmount(r.amount);
    return r.name.trim() === '' || r.name.length > 255 || !Number.isFinite(amount) || amount < 0;
};

export interface BuiltPlan {
    plan: BudgetPlan;
    json: string;
    /** Local ids of the rows sent, per group, in order — the server echoes rows back in this order. */
    sentIds: Record<BudgetGroup, string[]>;
    invalidCount: number;
}

/**
 * Turn local rows into the API payload. Untouched blank rows (just added via "Add row") are
 * skipped silently so they don't block saving; any other invalid row blocks the whole save,
 * because dropping it would delete a previously saved line from the server.
 */
export const buildPlan = (rows: RowsByGroup): BuiltPlan => {
    const out: BudgetPlanRow[] = [];
    const sentIds: Record<BudgetGroup, string[]> = { income: [], expense: [], saving: [], investment: [] };
    let invalidCount = 0;

    for (const g of BUDGET_GROUPS) {
        for (const r of rows[g]) {
            if (isBlankDraft(r)) continue;
            if (isRowInvalid(r)) { invalidCount++; continue; }
            out.push({
                group: g,
                name: r.name.trim(),
                amount: parseAmount(r.amount),
                include_in_total: r.include_in_total,
                category_ids: r.category_ids,
                tags: r.tags,
            });
            sentIds[g].push(r.id);
        }
    }

    const plan = { rows: out };
    return { plan, json: JSON.stringify(plan), sentIds, invalidCount };
};

/** The rows just sent, in the response shape — written to the query cache so returning to a month mid-save shows them. */
export const snapshotResponseRows = (rows: RowsByGroup, sentIds: Record<BudgetGroup, string[]>) => {
    const out = {} as Pick<BudgetResponse, 'income_rows' | 'expense_rows' | 'savings_rows' | 'investment_rows'>;
    for (const g of BUDGET_GROUPS) {
        const sent = new Set(sentIds[g]);
        out[RESPONSE_KEYS[g]] = rows[g].filter(r => sent.has(r.id)).map(r => ({
            name: r.name.trim(),
            amount: parseAmount(r.amount),
            actual_amount: r.actual,
            difference_pct: r.diff,
            category_ids: r.category_ids,
            tags: r.tags,
            include_in_total: r.include_in_total,
        }));
    }
    return out;
};

/** Patch server-computed actuals onto local rows without touching anything the user may be editing. */
export const mergeActuals = (rows: RowsByGroup, fresh: BudgetResponse, sentIds: Record<BudgetGroup, string[]>): RowsByGroup => {
    const next = { ...rows };
    for (const g of BUDGET_GROUPS) {
        const serverRows = fresh[RESPONSE_KEYS[g]] ?? [];
        const byId = new Map<string, BudgetRowResponse>();
        sentIds[g].forEach((id, i) => { if (serverRows[i]) byId.set(id, serverRows[i]); });
        next[g] = rows[g].map(r => {
            const s = byId.get(r.id);
            return s ? { ...r, actual: toNumber(s.actual_amount), diff: toNumber(s.difference_pct) } : r;
        });
    }
    return next;
};
