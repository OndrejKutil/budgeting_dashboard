/**
 * Profile API
 * Handles user profile operations
 */

import { apiClient } from '../client';
import type { UpdateProfileRequest } from '../types/requests';
import type { ProfileResponse } from '../types/responses';

export const profileApi = {
    getMe: async () => {
        const response = await apiClient.get<ProfileResponse>('/profile/me');
        return response.data;
    },

    updateProfile: async (data: UpdateProfileRequest) => {
        const response = await apiClient.put<ProfileResponse>('/profile/me', data);
        return response.data;
    },
};
