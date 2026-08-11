import { useQuery } from '@tanstack/react-query';
import { featuresApi } from '@/lib/api/endpoints';
import type { FeatureFlag } from '@/lib/api/types';

/**
 * Per-user feature flags.
 *
 * A hook rather than a context: the global 5-minute `staleTime` (see App.tsx) already collapses
 * this to one fetch per session however many components ask, so a provider would add wiring
 * without adding anything.
 */
export function useFeatureFlags() {
    return useQuery({
        queryKey: ['features'],
        queryFn: async () => (await featuresApi.getAll()).data ?? [],
    });
}

/**
 * Whether a single feature is on for the current user.
 *
 * Fails closed — while loading, and if the request fails, `enabled` is false. A flag is a gate,
 * so the safe default is "not yet" rather than flashing a feature the user may not have.
 */
export function useFeatureFlag(featureKey: string): { enabled: boolean; isLoading: boolean } {
    const { data, isLoading } = useFeatureFlags();

    const flag = (data ?? []).find((f: FeatureFlag) => f.feature_key === featureKey);

    return { enabled: flag?.is_enabled === true, isLoading };
}
