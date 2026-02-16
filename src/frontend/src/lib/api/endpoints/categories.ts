/**
 * Categories API
 * Handles category-related operations
 */

import { apiClient } from '../client';
import type { Category } from '../types/base';
import type { CreateCategoryRequest, UpdateCategoryRequest } from '../types/requests';

interface CategoriesResponse {
    data: Category[];
    count: number;
    success: boolean;
    message: string;
}

interface CategorySuccessResponse {
    data: Category[] | null;
    success: boolean;
    message: string;
}

export const categoriesApi = {
    getAll: async (params?: { category_id?: number; category_name?: string }) => {
        const response = await apiClient.get<CategoriesResponse>(
            '/categories/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    create: async (data: CreateCategoryRequest) => {
        const response = await apiClient.post<CategorySuccessResponse>(
            '/categories/',
            data
        );
        return response.data;
    },

    update: async (categoryId: number, data: UpdateCategoryRequest) => {
        const response = await apiClient.put<CategorySuccessResponse>(
            `/categories/${categoryId}`,
            data
        );
        return response.data;
    },

    delete: async (categoryId: number) => {
        const response = await apiClient.delete<CategorySuccessResponse>(
            `/categories/${categoryId}`
        );
        return response.data;
    },
};
