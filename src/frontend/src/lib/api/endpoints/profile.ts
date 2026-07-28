/**
 * Profile API
 * Handles user profile operations
 */

import { apiClient } from '../client';
import type { DeleteAccountRequest, UpdateProfileRequest } from '../types/requests';
import type { MessageResponse, ProfileResponse } from '../types/responses';

export const profileApi = {
    getMe: async () => {
        const response = await apiClient.get<ProfileResponse>('/profile/me');
        return response.data;
    },

    updateProfile: async (data: UpdateProfileRequest) => {
        const response = await apiClient.put<ProfileResponse>('/profile/me', data);
        return response.data;
    },

    /**
     * Permanently deletes the account. Requires re-authentication: a password for accounts with
     * an email identity, or the account's own email typed out for OAuth-only accounts.
     * POST rather than DELETE because the confirmation travels in the body.
     */
    deleteAccount: async (confirmation: DeleteAccountRequest) => {
        const response = await apiClient.post<MessageResponse>('/profile/delete-account', confirmation);
        return response.data;
    },
};
