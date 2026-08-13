import { apiClient } from '../client';
import type { T212ConnectionRequest } from '../types/requests';
import type {
    T212ConnectionResponse,
    T212ConnectionSuccessResponse,
    T212HistoryResponse,
    T212PositionsResponse,
} from '../types/responses';
import type { T212HistorySpan } from '../types/base';

export const trading212Api = {
    getConnection: () =>
        apiClient.get<T212ConnectionResponse>('/trading212/connection'),

    connect: (payload: T212ConnectionRequest) =>
        apiClient.post<T212ConnectionSuccessResponse>('/trading212/connection', payload),

    /** delete_history defaults to false -- deleting recorded value history is opt-in (SPEC.md §6). */
    disconnect: (deleteHistory: boolean = false) =>
        apiClient.delete<T212ConnectionSuccessResponse>(
            `/trading212/connection?delete_history=${deleteHistory}`
        ),

    getPositions: (baseCurrency: string) =>
        apiClient.get<T212PositionsResponse>('/trading212/positions', { base_currency: baseCurrency }),

    getHistory: (span: T212HistorySpan = '3m', baseCurrency?: string) =>
        apiClient.get<T212HistoryResponse>('/trading212/history', { span, base_currency: baseCurrency }),

    sync: () =>
        apiClient.post<T212ConnectionSuccessResponse>('/trading212/sync'),
};
