/**
 * Accounts API
 * Handles account-related operations
 */

import { apiClient } from '../client';
import type { CreateAccountRequest, UpdateAccountRequest } from '../types/requests';
import type { AccountsResponse } from '../types/responses';

export const accountsApi = {
    getAll: async (params?: { account_id?: string; account_name?: string; base_currency?: string }) => {
        const response = await apiClient.get<AccountsResponse>(
            '/accounts/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    create: async (account: CreateAccountRequest) => {
        const response = await apiClient.post<{ success: boolean; message: string }>(
            '/accounts/',
            account
        );
        return response.data;
    },

    update: async (accountId: string, account: UpdateAccountRequest) => {
        const response = await apiClient.put<{ success: boolean; message: string }>(
            `/accounts/${accountId}`,
            account
        );
        return response.data;
    },

    delete: async (accountId: string) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `/accounts/${accountId}`
        );
        return response.data;
    },
};
