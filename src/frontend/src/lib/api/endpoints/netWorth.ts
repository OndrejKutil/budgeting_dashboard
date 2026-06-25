import { apiClient } from '../client';
import type { NetWorthResponse } from '../types/responses';

export const netWorthApi = {
    getTimeline: async (params?: { start_date?: string; end_date?: string; base_currency?: string }) => {
        const response = await apiClient.get<NetWorthResponse>(
            '/net-worth/',
            params as Record<string, string | undefined>
        );
        return response.data;
    },
};
