/**
 * Transactions API
 * Handles transaction-related operations
 */

import { apiClient } from '../client';
import type { Transaction } from '../types/base';
import type { TransactionsResponse } from '../types/responses';

import type { CreateTransactionRequest, UpdateTransactionRequest } from '../types/requests';

interface TransactionSummaryResponse {
    success: boolean;
    message: string;
    count: number;
    /** Already converted into base_currency by the backend — safe to format directly. */
    total_amount: number;
    base_currency: string;
}

type TransactionFilterParams = {
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
    tag_id?: string;
    limit?: number;
    offset?: number;
};

export const transactionsApi = {
    getAll: async (params?: TransactionFilterParams) => {
        const response = await apiClient.get<TransactionsResponse>(
            '/transactions/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    // base_currency is required in practice, not optional: amounts are stored per account
    // currency, so without it the backend falls back to CZK and a mixed-currency filter comes
    // back converted into a currency the caller never asked for.
    getSummary: async (params?: Omit<TransactionFilterParams, 'limit' | 'offset'> & { base_currency?: string }) => {
        const response = await apiClient.get<TransactionSummaryResponse>(
            '/transactions/summary',
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
