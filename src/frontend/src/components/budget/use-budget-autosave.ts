import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { budgetApi } from '@/lib/api/endpoints';
import type { BudgetPlan } from '@/lib/api/types/requests';
import type { ApiResponse, BudgetResponse } from '@/lib/api/types/responses';
import { buildPlan, snapshotResponseRows, type BudgetGroup, type RowsByGroup } from './budget-rows';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'invalid' | 'error';

const DEBOUNCE_MS = 800;

interface PendingSave {
    month: number;
    year: number;
    plan: BudgetPlan;
    json: string;
    sentIds: Record<BudgetGroup, string[]>;
    rows: RowsByGroup;
}

interface Options {
    month: number;
    year: number;
    /** Currency the re-read actuals are converted into. */
    baseCurrency: string;
    rows: RowsByGroup;
    /** True once `rows` were loaded from the server for this month/year — never save before that. */
    ready: boolean;
    onSynced: (month: number, year: number, fresh: BudgetResponse, sentIds: Record<BudgetGroup, string[]>) => void;
    onError: (err: unknown) => void;
}

/**
 * Debounced autosave for the budget plan.
 *
 * Saves are serialized through a promise chain so a slow PUT can't land after a newer one.
 * Pending edits are flushed immediately when the month changes, the page unmounts, or the tab
 * is hidden — that's what keeps edits from being lost when navigating away.
 */
export function useBudgetAutosave({ month, year, baseCurrency, rows, ready, onSynced, onError }: Options) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<SaveStatus>('idle');

    const baselineRef = useRef<string | null>(null); // json of the plan the server has
    const pendingRef = useRef<PendingSave | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const chainRef = useRef<Promise<void>>(Promise.resolve());
    const inFlightRef = useRef(0);
    const keyRef = useRef(`${year}-${month}`);
    const mountedRef = useRef(true);
    const rowsRef = useRef(rows);
    const callbacksRef = useRef({ onSynced, onError });
    callbacksRef.current = { onSynced, onError };

    const persist = useCallback(async (p: PendingSave): Promise<BudgetResponse> => {
        try {
            await budgetApi.updateBudget(p.month, p.year, p.plan);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 404)) throw err;
            try {
                await budgetApi.createBudget(p.month, p.year, p.plan);
            } catch (createErr) {
                // Another tab created it between our PUT and POST.
                if (!(createErr instanceof ApiError && createErr.status === 409)) throw createErr;
                await budgetApi.updateBudget(p.month, p.year, p.plan);
            }
        }
        // Actuals depend on the linked categories/tags, so re-read the computed view.
        const fresh = await budgetApi.getBudget(p.month, p.year, baseCurrency);
        queryClient.setQueryData(['budget', p.month, p.year], fresh);
        return fresh.data;
    }, [queryClient, baseCurrency]);

    const flush = useCallback(() => {
        clearTimeout(timerRef.current);
        const p = pendingRef.current;
        if (!p) return;
        pendingRef.current = null;

        const key = `${p.year}-${p.month}`;
        const isCurrent = () => mountedRef.current && keyRef.current === key;

        // Optimistically write the plan into the cache, so leaving and coming back before the
        // request finishes doesn't initialise the page from the pre-edit data.
        queryClient.setQueryData<ApiResponse<BudgetResponse>>(['budget', p.month, p.year], old =>
            old ? { ...old, data: { ...old.data, ...snapshotResponseRows(p.rows, p.sentIds) } } : old);

        inFlightRef.current++;
        chainRef.current = chainRef.current.then(async () => {
            if (isCurrent()) setStatus('saving');
            try {
                const fresh = await persist(p);
                inFlightRef.current--;
                callbacksRef.current.onSynced(p.month, p.year, fresh, p.sentIds);
                if (isCurrent() && !pendingRef.current && inFlightRef.current === 0) setStatus('saved');
            } catch (err) {
                inFlightRef.current--;
                if (isCurrent()) {
                    baselineRef.current = null; // the server doesn't have this; any edit or retry resends
                    setStatus('error');
                }
                callbacksRef.current.onError(err);
                // The cache holds the optimistic snapshot, which never made it — drop it.
                queryClient.invalidateQueries({ queryKey: ['budget', p.month, p.year] });
            }
        });
    }, [persist, queryClient]);

    const schedule = useCallback((current: RowsByGroup) => {
        const built = buildPlan(current);
        clearTimeout(timerRef.current);

        if (built.invalidCount > 0) {
            pendingRef.current = null;
            setStatus('invalid');
            return;
        }
        if (built.json === baselineRef.current) {
            pendingRef.current = null;
            setStatus(s => (inFlightRef.current > 0 ? 'saving' : s === 'idle' ? 'idle' : 'saved'));
            return;
        }

        baselineRef.current = built.json;
        pendingRef.current = { month, year, ...built, rows: current };
        setStatus('pending');
        timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    }, [month, year, flush]);

    // Rows changed → (re)schedule a save.
    useEffect(() => {
        rowsRef.current = rows;
        if (ready) schedule(rows);
    }, [rows, ready, schedule]);

    // Month changed or page unmounted → save whatever is pending for the old month right now.
    useEffect(() => {
        keyRef.current = `${year}-${month}`;
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            flush();
        };
    }, [month, year, flush]);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!pendingRef.current && inFlightRef.current === 0) return;
            flush();
            e.preventDefault();
            e.returnValue = '';
        };
        const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
        window.addEventListener('beforeunload', onBeforeUnload);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [flush]);

    /** Call when rows are (re)loaded from the server: they're the new "already saved" baseline. */
    const markClean = useCallback((loaded: RowsByGroup) => {
        clearTimeout(timerRef.current);
        pendingRef.current = null;
        baselineRef.current = buildPlan(loaded).json;
        setStatus('idle');
    }, []);

    const retry = useCallback(() => {
        baselineRef.current = null;
        schedule(rowsRef.current);
        flush();
    }, [schedule, flush]);

    return { status, markClean, retry };
}
