import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/api/endpoints';

interface Options {
    /** Extra years after the newest one, for pages that plan ahead (budget, dated transactions). */
    future?: number;
    /** A year that must be offered even if it has no data — e.g. one already selected via the URL. */
    include?: number;
}

/**
 * Years to offer in period pickers, newest first, derived from the user's transactions.
 *
 * Keyed under ['transactions'] so creating/deleting transactions (which invalidate that prefix)
 * refreshes it. Until it loads, falls back to just the current year.
 */
export function useAvailableYears({ future = 0, include }: Options = {}): number[] {
    const { data } = useQuery({
        queryKey: ['transactions', 'years'],
        queryFn: async () => (await transactionsApi.getYears()).years,
        staleTime: 1000 * 60 * 30,
    });

    return useMemo(() => {
        const set = new Set(data ?? [new Date().getFullYear()]);
        const newest = Math.max(...set);
        for (let i = 1; i <= future; i++) set.add(newest + i);
        if (include !== undefined && Number.isFinite(include)) set.add(include);
        return [...set].sort((a, b) => b - a);
    }, [data, future, include]);
}
