/**
 * Accounts API
 * Handles account-related operations
 */

import { apiClient } from '../client';
import type { Account } from '../types/base';

interface AccountsResponse {
    data: Account[];
    count: number;
    success: boolean;
    message: string;
}

export const accountsApi = {
    getAll: async (params?: { account_id?: string; account_name?: string }) => {
        const response = await apiClient.get<AccountsResponse>(
            '/accounts/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    create: async (account: { account_name: string; type: string; currency: string }) => {
        const response = await apiClient.post<{ success: boolean; message: string }>(
            '/accounts/',
            account
        );
        return response.data;
    },

    update: async (accountId: string, account: { account_name: string; type: string; currency: string }) => {
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
