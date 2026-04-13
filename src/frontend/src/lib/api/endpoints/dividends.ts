import { apiClient } from '../client';
import type { DividendPortfolioRequest } from '../types/requests';
import type { DividendPortfolioResponse, DividendPortfolioSuccessResponse } from '../types/responses';

export const dividendApi = {
    getPortfolio: () =>
        apiClient.get<DividendPortfolioResponse>('/dividends/'),

    createPortfolio: (payload: DividendPortfolioRequest) =>
        apiClient.post<DividendPortfolioSuccessResponse>('/dividends/', payload),

    updatePortfolio: (payload: DividendPortfolioRequest) =>
        apiClient.put<DividendPortfolioSuccessResponse>('/dividends/', payload),

    deletePortfolio: () =>
        apiClient.delete<DividendPortfolioSuccessResponse>('/dividends/'),
};
