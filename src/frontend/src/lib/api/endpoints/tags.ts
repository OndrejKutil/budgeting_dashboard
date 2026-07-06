import { apiClient } from '../client';
import type { Tag } from '../types/base';
import type { CreateTagRequest, UpdateTagRequest } from '../types/requests';

interface TagsResponse {
    data: Tag[];
    count: number;
    success: boolean;
    message: string;
}

interface TagSuccessResponse {
    success: boolean;
    message: string;
    data: Tag[] | null;
}

export const tagsApi = {
    getAll: async () => {
        const response = await apiClient.get<TagsResponse>('/tags/');
        return response.data;
    },

    create: async (tag: CreateTagRequest) => {
        const response = await apiClient.post<TagSuccessResponse>('/tags/', tag);
        return response.data;
    },

    update: async (tagId: number, tag: UpdateTagRequest) => {
        const response = await apiClient.put<TagSuccessResponse>(`/tags/${tagId}`, tag);
        return response.data;
    },

    delete: async (tagId: number) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/tags/${tagId}`);
        return response.data;
    },
};
