import { apiClient } from '../client';
import type { Recurring } from '../types/base';
import type { RecurringResponse, RecurringSuccessResponse } from '../types/responses';
import type { CreateRecurringRequest, UpdateRecurringRequest } from '../types/requests';

export const recurringApi = {
    getAll: async (params?: { base_currency?: string; include_inactive?: boolean }) => {
        const response = await apiClient.get<RecurringResponse>(
            '/recurring/',
            params as Record<string, string | boolean | undefined>
        );
        return response.data;
    },

    create: async (data: CreateRecurringRequest) => {
        const response = await apiClient.post<RecurringSuccessResponse>('/recurring/', data);
        return response.data;
    },

    update: async (id: string, data: UpdateRecurringRequest) => {
        const response = await apiClient.put<RecurringSuccessResponse>(`/recurring/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<RecurringSuccessResponse>(`/recurring/${id}`);
        return response.data;
    },

    post: async (id: string) => {
        const response = await apiClient.post<RecurringSuccessResponse>(`/recurring/${id}/post`, {});
        return response.data;
    },
};
