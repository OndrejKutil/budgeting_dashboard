import { apiClient } from '../client';
import type {
    ImportBatchDeleteResponse,
    ImportBatchesResponse,
    StatementCommitResponse,
    StatementPreviewResponse,
} from '../types/responses';
import type { StatementCommitRequest } from '../types/requests';
import type { StatementMapping } from '../types/base';

export const statementImportApi = {
    /**
     * Parse a bank export into draft rows. Writes nothing. `accountId` is optional: without it
     * there is no duplicate or currency check (used before the user has any account).
     * `mapping` comes from the mapping screen; omit it to let the backend recognise the file.
     */
    preview: async ({ file, accountId, mapping, useAi = true }: { file: File; accountId?: string; mapping?: StatementMapping | null; useAi?: boolean }) => {
        const formData = new FormData();
        formData.append('file', file);
        if (accountId) formData.append('account_id', accountId);
        if (mapping) formData.append('mapping', JSON.stringify(mapping));
        formData.append('use_ai', useAi ? 'true' : 'false');

        const response = await apiClient.postForm<StatementPreviewResponse>('/statement-import/preview', formData);
        return response.data;
    },

    /** Save the reviewed rows as transactions in one batch. */
    commit: async (request: StatementCommitRequest) => {
        const response = await apiClient.post<StatementCommitResponse>('/statement-import/commit', request);
        return response.data;
    },

    /** Past imports, newest first. */
    batches: async () => {
        const response = await apiClient.get<ImportBatchesResponse>('/statement-import/batches');
        return response.data;
    },

    /** Undo one import: deletes its transactions (edited ones too) and the batch. */
    undo: async (batchId: string) => {
        const response = await apiClient.delete<ImportBatchDeleteResponse>(`/statement-import/batches/${batchId}`);
        return response.data;
    },
};
