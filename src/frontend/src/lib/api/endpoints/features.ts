import { apiClient } from '../client';
import type { FeatureFlagsResponse } from '../types/responses';

export const featuresApi = {
    getAll: async () => {
        const response = await apiClient.get<FeatureFlagsResponse>('/features/');
        return response.data;
    },
};
