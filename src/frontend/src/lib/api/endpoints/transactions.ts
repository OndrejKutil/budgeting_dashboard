/**
 * Transactions API
 * Handles transaction-related operations
 */

import { apiClient } from '../client';
import type { Transaction } from '../types/base';
import type { TransactionsResponse } from '../types/responses';

interface TransactionCreateUpdate {
    account_id_fk: string;
    category_id_fk: number;
    amount: number;
    date: string;
    notes?: string | null;
    savings_fund_id_fk?: string | null;
}

export const transactionsApi = {
    getAll: async (params?: {
        start_date?: string;
        end_date?: string;
        category_id?: string;
        account_id?: string;
        transaction_id?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }) => {
        const response = await apiClient.get<TransactionsResponse>(
            '/transactions/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    create: async (transaction: TransactionCreateUpdate) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: Transaction[] }>(
            '/transactions/',
            transaction
        );
        return response.data;
    },

    update: async (transactionId: string, transaction: TransactionCreateUpdate) => {
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
