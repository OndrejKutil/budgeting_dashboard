/**
 * API Request Types
 * Interfaces for request payloads sent to the API.
 * These match the request schemas defined in backend/schemas/requests.py
 */

// ================================================================================================
//                                   Authentication Requests
// ================================================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
    email: string;
    password: string;
}

/**
 * Register request payload
 */
export interface RegisterRequest {
    email: string;
    password: string;
    full_name?: string;
}

// ================================================================================================
//                                   Profile Requests
// ================================================================================================

/**
 * Update profile request payload
 */
export interface UpdateProfileRequest {
    full_name?: string;
    currency?: string;
}

// ================================================================================================
//                                   Transaction Requests
// ================================================================================================

/**
 * Create transaction request payload
 */
export interface CreateTransactionRequest {
    account_id_fk: string;
    category_id_fk: number;
    amount: number;
    date: string;
    notes?: string;
    savings_fund_id_fk?: string;
}

/**
 * Update transaction request payload
 */
export interface UpdateTransactionRequest {
    account_id_fk?: string;
    category_id_fk?: number;
    amount?: number;
    date?: string;
    notes?: string;
    savings_fund_id_fk?: string;
}

// ================================================================================================
//                                   Account Requests
// ================================================================================================

/**
 * Create account request payload
 */
export interface CreateAccountRequest {
    account_name: string;
    type: string;
    currency?: string;
    current_balance?: number;
}

/**
 * Update account request payload
 */
export interface UpdateAccountRequest {
    account_name?: string;
    type?: string;
    currency?: string;
    current_balance?: number;
}

// ================================================================================================
//                                   Savings Fund Requests
// ================================================================================================

/**
 * Create savings fund request payload
 */
export interface CreateSavingsFundRequest {
    fund_name: string;
    target_amount: number;
}

/**
 * Update savings fund request payload
 */
export interface UpdateSavingsFundRequest {
    fund_name?: string;
    target_amount?: number;
}

// ================================================================================================
//                                   Budget Requests
// ================================================================================================

/**
 * Schema for a single row in the budget plan JSON
 */
export interface BudgetPlanRow {
    group: string;
    name: string;
    amount: number;
    include_in_total: boolean;
    category_id: number | null;
}

/**
 * Schema for the entire budget plan JSON structure
 */
export interface BudgetPlan {
    rows: BudgetPlanRow[];
}
