import { useQuery } from '@tanstack/react-query';
import { recurringApi } from '@/lib/api/endpoints';
import { daysDiff } from '@/lib/dates';
import { useUser } from '@/contexts/user-context';
import { useFeatureFlags } from '@/hooks/use-feature-flag';
import { navGroups, type NavGroup } from './nav-config';

/** Nav groups with feature-gated items removed for the current user. */
export function useVisibleNavGroups(): readonly NavGroup[] {
  const { data: featureFlags } = useFeatureFlags();
  const enabledFlags = new Set((featureFlags ?? []).filter((f) => f.is_enabled).map((f) => f.feature_key));
  return navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.flag || enabledFlags.has(item.flag)),
  }));
}

/** Number of recurring transactions that are due today or overdue. */
export function useDueRecurringCount(): number {
  const { currency: userCurrency } = useUser();
  const { data } = useQuery({
    queryKey: ['recurring', userCurrency],
    // Same key and params as RecurringPage, which lists paused templates as well.
    queryFn: async () => recurringApi.getAll({ base_currency: userCurrency, include_inactive: true }),
    staleTime: 5 * 60 * 1000,
  });
  return (data?.data ?? []).filter((r) => r.is_active !== false && daysDiff(r.next_date) <= 0).length;
}
