import { apiClient } from '../client';
import type { ExtractionResponse } from '../types/responses';
import type { Transaction } from '../types/base';
import type { CreateTransactionRequest } from '../types/requests';

interface ImportTransactionsResponse {
    success: boolean;
    message: string;
    data: Transaction[] | null;
}

export const screenshotImportApi = {
    /**
     * Send a screenshot of bank notifications for extraction into draft transactions.
     * Returns drafts to review — never finished transactions.
     */
    extract: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.postForm<ExtractionResponse>(
            '/screenshot-import/extract',
            formData
        );
        return response.data;
    },

    /**
     * Save reviewed drafts as real transactions, one request for the whole batch.
     */
    import: async (transactions: CreateTransactionRequest[]) => {
        const response = await apiClient.post<ImportTransactionsResponse>(
            '/screenshot-import/import',
            { transactions }
        );
        return response.data;
    },
};
