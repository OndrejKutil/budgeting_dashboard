import { apiClient } from '../client';
import type { BudgetPlan } from '../types/requests';
import type { BudgetResponse, BudgetSuccessResponse } from '../types/responses';

export const budgetApi = {
    getBudget: (month: number, year: number) =>
        apiClient.get<BudgetResponse>('/budgets/', { month, year }),

    createBudget: (month: number, year: number, plan: BudgetPlan) =>
        apiClient.post<BudgetSuccessResponse>(`/budgets/?month=${month}&year=${year}`, plan),

    updateBudget: (month: number, year: number, plan: BudgetPlan) =>
        apiClient.put<BudgetSuccessResponse>(`/budgets/?month=${month}&year=${year}`, plan),

    deleteBudget: (month: number, year: number) =>
        apiClient.delete<BudgetSuccessResponse>(`/budgets/?month=${month}&year=${year}`),
};
