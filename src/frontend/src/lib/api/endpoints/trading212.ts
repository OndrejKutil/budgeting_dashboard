import { apiClient } from '../client';
import type { T212ConnectionRequest } from '../types/requests';
import type {
    T212ConnectionResponse,
    T212ConnectionSuccessResponse,
    T212HistoryResponse,
    T212PositionsResponse,
} from '../types/responses';
import type { T212HistorySpan } from '../types/base';

// Unwraps ApiResponse<T>.data (the parsed body) once here, same convention as netWorthApi, so
// callers work directly with the backend's own {data, success, message} shape instead of a
// double-wrapped ApiResponse<XResponse>.
export const trading212Api = {
    getConnection: async () =>
        (await apiClient.get<T212ConnectionResponse>('/trading212/connection')).data,

    connect: async (payload: T212ConnectionRequest) =>
        (await apiClient.post<T212ConnectionSuccessResponse>('/trading212/connection', payload)).data,

    /** delete_history defaults to false -- deleting recorded value history is opt-in (SPEC.md §6). */
    disconnect: async (deleteHistory: boolean = false) =>
        (await apiClient.delete<T212ConnectionSuccessResponse>(
            `/trading212/connection?delete_history=${deleteHistory}`
        )).data,

    getPositions: async (baseCurrency: string) =>
        (await apiClient.get<T212PositionsResponse>('/trading212/positions', { base_currency: baseCurrency })).data,

    getHistory: async (span: T212HistorySpan = '3m', baseCurrency?: string) =>
        (await apiClient.get<T212HistoryResponse>('/trading212/history', { span, base_currency: baseCurrency })).data,

    sync: async () =>
        (await apiClient.post<T212ConnectionSuccessResponse>('/trading212/sync')).data,
};
