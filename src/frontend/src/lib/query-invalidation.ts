import type { QueryClient } from '@tanstack/react-query';

/**
 * Every cached query whose numbers are computed from transactions. With the global 5-minute
 * staleTime (App.tsx), anything missing here keeps showing old figures after a write -- that is
 * how account balances stayed stale after adding a transaction.
 */
const TRANSACTION_DERIVED_KEYS = [
  'transactions',
  'transactions-summary',
  'summary',
  'accounts',
  'net-worth',
  'funds',
  'monthly-analytics',
  'yearly-analytics',
  'yearly-heatmap',
  'cashflow',
  'emergency-fund',
] as const;

/**
 * Call after any write that creates, changes or deletes transactions (the transaction form,
 * transfers, fund withdrawals, posting a recurring template, screenshot import). Visible queries
 * refetch at once; the rest refetch the next time they are shown.
 */
export function invalidateTransactionData(queryClient: QueryClient) {
  for (const key of TRANSACTION_DERIVED_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
  // Budget actuals depend on transactions too, but the Budget Maker autosaves local edits:
  // only mark it stale so it reloads when next opened, never refetch it underneath an editor.
  queryClient.invalidateQueries({ queryKey: ['budget'], refetchType: 'none' });
}
