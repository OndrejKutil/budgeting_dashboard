/**
 * Account Groups API
 * Handles account-group-related operations (labels tying several accounts together,
 * e.g. one bank account held in multiple currencies)
 */

import { apiClient } from '../client';
import type { CreateAccountGroupRequest } from '../types/requests';
import type { AccountGroupsResponse, AccountGroupSuccessResponse } from '../types/responses';

export const accountGroupsApi = {
    getAll: async () => {
        const response = await apiClient.get<AccountGroupsResponse>('/account-groups/');
        return response.data;
    },

    create: async (group: CreateAccountGroupRequest) => {
        const response = await apiClient.post<AccountGroupSuccessResponse>(
            '/account-groups/',
            group
        );
        return response.data;
    },

    update: async (groupId: string, group: CreateAccountGroupRequest) => {
        const response = await apiClient.put<AccountGroupSuccessResponse>(
            `/account-groups/${groupId}`,
            group
        );
        return response.data;
    },

    delete: async (groupId: string) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `/account-groups/${groupId}`
        );
        return response.data;
    },
};
