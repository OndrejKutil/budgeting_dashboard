/**
 * Transactions API
 * Handles transaction-related operations
 */

import { apiClient } from '../client';
import type { Transaction } from '../types/base';
import type { TransactionsResponse } from '../types/responses';

import type { CreateTransactionRequest, UpdateTransactionRequest } from '../types/requests';

export const transactionsApi = {
    getAll: async (params?: {
        start_date?: string;
        end_date?: string;
        category_id?: string;
        account_id?: string;
        savings_fund_id?: string;
        transaction_id?: string;
        search?: string;
        category_type?: string;
        min_amount?: number;
        max_amount?: number;
        limit?: number;
        offset?: number;
    }) => {
        const response = await apiClient.get<TransactionsResponse>(
            '/transactions/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    create: async (transaction: CreateTransactionRequest) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: Transaction[] }>(
            '/transactions/',
            transaction
        );
        return response.data;
    },

    update: async (transactionId: string, transaction: UpdateTransactionRequest) => {
        const response = await apiClient.put<{ success: boolean; message: string; data: Transaction[] }>(
            `/transactions/${transactionId}`,
            transaction
        );
        return response.data;
    },

    delete: async (transactionId: string) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `/transactions/${transactionId}`
        );
        return response.data;
    },
};
