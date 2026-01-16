/**
 * API Response Types
 * Wrapper interfaces for API responses.
 * These match the response schemas defined in backend/schemas/responses.py
 */

import type {
    User,
    ProfileData,
    Transaction,
    Category,
    Account,
    SavingsFund,
    SummaryData,
    MonthlyAnalytics,
    YearlyAnalyticsData,
    EmergencyFundData,
} from './base';

// ================================================================================================
//                                   Generic Response
// ================================================================================================

/**
 * Generic API response wrapper used internally
 */
export interface ApiResponse<T> {
    data: T;
    status: number;
}

// ================================================================================================
//                                   Authentication Responses
// ================================================================================================

/**
 * Authentication response (login/register)
 */
export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user_id: string;
    data: {
        user: User;
        session: {
            access_token: string;
            refresh_token: string;
        };
    };
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
    data: {
        access_token: string;
        refresh_token: string;
        id: string;
    };
    user: {
        id: string;
    };
    session: {
        access_token: string;
        refresh_token: string;
    };
    success: boolean;
    message: string;
}

/**
 * Profile response
 */
export interface ProfileResponse {
    data: ProfileData;
    success: boolean;
    message: string;
}

// ================================================================================================
//                                   Transaction Responses
// ================================================================================================

/**
 * Transactions list response with pagination
 */
export interface TransactionsResponse {
    data: Transaction[];
    count: number;
    success: boolean;
    message: string;
}

/**
 * Single transaction response
 */
export interface TransactionResponse {
    data: Transaction;
    success: boolean;
    message: string;
}

// ================================================================================================
//                                   Category Responses
// ================================================================================================

/**
 * Categories list response
 */
export interface CategoriesResponse {
    data: Category[];
    success: boolean;
    message: string;
}

// ================================================================================================
//                                   Account Responses
// ================================================================================================

/**
 * Accounts list response
 */
export interface AccountsResponse {
    data: Account[];
    success: boolean;
    message: string;
}

/**
 * Single account response
 */
export interface AccountResponse {
    data: Account;
    success: boolean;
    message: string;
}

// ================================================================================================
//                                   Savings Fund Responses
// ================================================================================================

/**
 * Savings funds list response
 */
export interface SavingsFundsResponse {
    data: SavingsFund[];
    success: boolean;
    message: string;
}

/**
 * Single savings fund response
 */
export interface SavingsFundResponse {
    data: SavingsFund;
    success: boolean;
    message: string;
}

// ================================================================================================
//                                   Analytics Responses
// ================================================================================================

/**
 * Dashboard summary response
 */
export interface SummaryResponse {
    data: SummaryData;
    success: boolean;
    message: string;
}

/**
 * Monthly analytics response
 */
export interface MonthlyAnalyticsResponse {
    data: MonthlyAnalytics;
    success: boolean;
    message: string;
}

/**
 * Yearly analytics response
 */
export interface YearlyAnalyticsResponse {
    data: YearlyAnalyticsData;
    success: boolean;
    message: string;
}

/**
 * Emergency fund analysis response
 */
export interface EmergencyFundResponse {
    data: EmergencyFundData;
    success: boolean;
    message: string;
}

// ================================================================================================
//                                   Health Check Response
// ================================================================================================

/**
 * Health check response
 */
export interface HealthResponse {
    status: string;
    message?: string;
}
