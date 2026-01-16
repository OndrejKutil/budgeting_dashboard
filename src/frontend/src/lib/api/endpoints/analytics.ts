/**
 * Analytics API
 * Handles monthly, yearly, and emergency fund analytics
 */

import { apiClient } from '../client';
import type { MonthlyAnalyticsResponse, YearlyAnalyticsResponse, EmergencyFundResponse } from '../types/responses';

export const analyticsApi = {
    getMonthly: async (params?: { year?: number; month?: number }) => {
        const response = await apiClient.get<MonthlyAnalyticsResponse>(
            '/monthly/analytics',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    getYearly: async (params?: { year?: number }) => {
        const response = await apiClient.get<YearlyAnalyticsResponse>(
            '/yearly/analytics',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },

    getEmergencyFund: async (params?: { year?: number }) => {
        const response = await apiClient.get<EmergencyFundResponse>(
            '/yearly/emergency-fund',
            params as Record<string, string | number | undefined>
        );
        return response.data;
    },
};
