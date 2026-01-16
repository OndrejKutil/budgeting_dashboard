/**
 * Categories API
 * Handles category-related operations
 */

import { apiClient } from '../client';
import type { Category } from '../types/base';

interface CategoriesResponse {
    data: Category[];
    count: number;
}

export const categoriesApi = {
    getAll: async (params?: { category_id?: number; category_name?: string }) => {
        const response = await apiClient.get<CategoriesResponse>(
            '/categories/',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },
};
