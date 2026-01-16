/**
 * Summary API
 * Handles dashboard summary data
 */

import { apiClient } from '../client';
import type { SummaryResponse } from '../types/responses';

export const summaryApi = {
    get: async (params?: { start_date?: string; end_date?: string }) => {
        const response = await apiClient.get<SummaryResponse>(
            '/summary/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },
};
