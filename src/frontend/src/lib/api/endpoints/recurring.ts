import { apiClient } from '../client';
import type { Recurring } from '../types/base';
import type { RecurringNotificationsResponse, RecurringResponse, RecurringSuccessResponse } from '../types/responses';
import type { CreateRecurringRequest, ToggleRecurringRequest, UpdateRecurringRequest } from '../types/requests';

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

    toggle: async (id: string, data: ToggleRecurringRequest) => {
        const response = await apiClient.patch<RecurringSuccessResponse>(`/recurring/${id}`, data);
        return response.data;
    },

    /** Auto-posted occurrences not yet dismissed, from the last `days` days (backend default 7). */
    getNotifications: async () => {
        const response = await apiClient.get<RecurringNotificationsResponse>('/recurring/notifications');
        return response.data;
    },

    ackNotification: async (postingId: string) => {
        const response = await apiClient.post<RecurringSuccessResponse>(`/recurring/notifications/${postingId}/ack`, {});
        return response.data;
    },

    ackAllNotifications: async () => {
        const response = await apiClient.post<RecurringSuccessResponse>('/recurring/notifications/ack-all', {});
        return response.data;
    },
};
