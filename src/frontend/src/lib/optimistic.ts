/**
 * Optimistic list mutations
 *
 * Small helper around the standard React Query optimistic-update recipe for queries whose
 * data is a flat array (accounts, categories, funds, recurring). It is deliberately *not* a
 * `useMutation` wrapper — pages keep their own `onSuccess`/`onError` toasts and compose these
 * handlers in, so the existing per-page copy stays where it is.
 *
 * Usage:
 *   const optimistic = optimisticList<Account, string>(queryClient, ['accounts'],
 *     (prev, id) => withoutId(prev, 'accounts_id_pk', id));
 *
 *   useMutation({
 *     mutationFn: accountsApi.delete,
 *     onMutate: optimistic.onMutate,
 *     onSuccess: () => toast(...),
 *     onError: (err, _vars, ctx) => { optimistic.rollback(ctx); toast(...); },
 *     onSettled: optimistic.onSettled,
 *   });
 *
 * Rows written optimistically carry a temporary id, so they must not be actionable until the
 * server replaces them — see `isOptimistic`.
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';

// ============================================
// Optimistic marker
// ============================================

/** An entity that exists only in the cache until the server confirms it. */
export type Optimistic<TItem> = TItem & { __optimistic?: true };

/** Tags an entity as cache-only. Rows carrying this hold a temp id and cannot be acted on. */
export function markOptimistic<TItem>(item: TItem): Optimistic<TItem> {
  return { ...item, __optimistic: true as const };
}

/** True while the row is still a local placeholder — disable its edit/delete actions. */
export function isOptimistic(item: unknown): boolean {
  return (
    typeof item === 'object' &&
    item !== null &&
    (item as { __optimistic?: boolean }).__optimistic === true
  );
}

// ============================================
// Temporary ids
// ============================================

/**
 * Numeric temp ids count down from -1 so they can never collide with a real (positive)
 * serial PK, and never with each other.
 */
let nextTempNumericId = -1;

/** Temp id for tables with a uuid PK (accounts, savings funds, recurring). */
export function tempUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `temp-${nextTempNumericId--}`;
}

/** Temp id for tables with an integer PK (categories). Always negative. */
export function tempNumericId(): number {
  return nextTempNumericId--;
}

// ============================================
// List transforms
// ============================================

/** Removes the entry whose `idKey` matches `id`. */
export function withoutId<TItem, TKey extends keyof TItem>(
  list: TItem[],
  idKey: TKey,
  id: TItem[TKey]
): TItem[] {
  return list.filter((item) => item[idKey] !== id);
}

/** Merges `patch` into the entry whose `idKey` matches `id`, leaving the rest untouched. */
export function patchById<TItem, TKey extends keyof TItem>(
  list: TItem[],
  idKey: TKey,
  id: TItem[TKey],
  patch: Partial<TItem>
): TItem[] {
  return list.map((item) => (item[idKey] === id ? { ...item, ...patch } : item));
}

// ============================================
// Factory
// ============================================

/** Snapshot handed from `onMutate` to `onError` so a failed write can be undone. */
export interface OptimisticContext<TData> {
  previous: TData | undefined;
}

/** Back-compat alias for the array case. */
export type OptimisticListContext<TItem> = OptimisticContext<TItem[]>;

/**
 * Builds `onMutate` / `rollback` / `onSettled` for any query, operating on the whole cached
 * value. Use `optimisticList` instead when the cached value is a plain array.
 *
 * `apply` receives the current cached value plus the mutation variables and returns the value
 * as it should look while the request is in flight.
 */
export function optimisticQuery<TData, TVars>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  apply: (previous: TData | undefined, variables: TVars) => TData | undefined
) {
  return {
    onMutate: async (variables: TVars): Promise<OptimisticContext<TData>> => {
      // Stop in-flight refetches from overwriting the optimistic value.
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<TData>(queryKey);
      queryClient.setQueryData<TData>(queryKey, apply(previous, variables));

      return { previous };
    },

    rollback: (context: OptimisticContext<TData> | undefined): void => {
      if (context) {
        // Restoring `undefined` is correct when the query had no data yet — the
        // `onSettled` invalidation then refetches from scratch.
        queryClient.setQueryData<TData>(queryKey, context.previous);
      }
    },

    onSettled: (): void => {
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * `optimisticQuery` for a query whose data is a flat array.
 *
 * `apply` must return a *complete* entity on create — these pages derive buckets
 * (active/inactive, native/foreign currency) from the list, and a partial object lands in the
 * wrong bucket and visibly jumps when the server row arrives.
 */
export function optimisticList<TItem, TVars>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  apply: (previous: TItem[], variables: TVars) => TItem[]
) {
  return optimisticQuery<TItem[], TVars>(queryClient, queryKey, (previous, variables) =>
    apply(previous ?? [], variables)
  );
}
