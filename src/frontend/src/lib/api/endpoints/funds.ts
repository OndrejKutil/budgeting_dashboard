/**
 * Savings Funds API
 * Handles savings fund-related operations
 */

import { apiClient } from '../client';
import type { SavingsFund } from '../types/base';
import type { CreateSavingsFundRequest, UpdateSavingsFundRequest } from '../types/requests';

interface FundsResponse {
    data: SavingsFund[];
    count: number;
    success: boolean;
    message: string;
}

export const fundsApi = {
    getAll: async (params?: { fund_id?: string; fund_name?: string }) => {
        const response = await apiClient.get<FundsResponse>('/funds/', params);
        return response.data;
    },

    create: async (fund: CreateSavingsFundRequest & { user_id_fk: string }) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: SavingsFund[] }>(
            '/funds/',
            fund
        );
        return response.data;
    },

    update: async (fundId: string, fund: UpdateSavingsFundRequest) => {
        const response = await apiClient.put<{ success: boolean; message: string; data: SavingsFund[] }>(
            `/funds/${fundId}`,
            fund
        );
        return response.data;
    },

    delete: async (fundId: string) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `/funds/${fundId}`
        );
        return response.data;
    },
};
