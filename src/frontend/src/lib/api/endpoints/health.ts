/**
 * Health API
 * Handles health check for backend warmup
 */

import { apiClient } from '../client';

export const healthApi = {
    check: () => {
        return apiClient.get<{ status: string }>('/health');
    },
};
