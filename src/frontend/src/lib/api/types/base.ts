/**
 * Base Data Types
 * Core interfaces that represent backend data models.
 * These match the schemas defined in backend/schemas/base.py
 */

// ================================================================================================
//                                   Authentication Types
// ================================================================================================

/**
 * User data from Supabase Auth
 */
export interface User {
    id: string;
    email: string;
    role?: string;
    aud?: string;
    email_confirmed_at?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Identity provider data for user authentication
 */
export interface IdentityData {
    id: string | null;
    identity_id: string | null;
    user_id: string | null;
    provider: string | null;
    identity_data: Record<string, unknown> | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    updated_at: string | null;
}

/**
 * User profile data from Supabase Auth
 */
export interface ProfileData {
    id: string | null;
    aud: string | null;
    role: string | null;
    is_anonymous: boolean;
    email: string | null;
    email_confirmed_at: string | null;
    email_change_sent_at: string | null;
    new_email: string | null;
    phone: string | null;
    phone_confirmed_at: string | null;
    new_phone: string | null;
    created_at: string | null;
    updated_at: string | null;
    last_sign_in_at: string | null;
    confirmed_at: string | null;
    confirmation_sent_at: string | null;
    recovery_sent_at: string | null;
    invited_at: string | null;
    app_metadata: Record<string, unknown> | null;
    user_metadata: {
        full_name?: string;
        avatar_url?: string;
        currency?: string;
        [key: string]: unknown;
    } | null;
    identities: IdentityData[] | null;
    factors: Record<string, unknown>[] | null;
    action_link: string | null;
}

// ================================================================================================
//                                   Transaction Types
// ================================================================================================

/**
 * Individual transaction record
 * Matches backend TransactionData schema
 */
export interface Transaction {
    id_pk: string;
    user_id_fk: string | null;
    account_id_fk: string;
    category_id_fk: number;
    amount: number;
    date: string;
    notes: string | null;
    created_at: string | null;
    savings_fund_id_fk: string | null;
}

// ================================================================================================
//                                   Category Types
// ================================================================================================

/**
 * Category type enum values
 */
export type CategoryType = 'expense' | 'income' | 'transfer' | 'saving' | 'investment' | 'exclude';

/**
 * Spending type enum values for expense categorization
 */
export type SpendingType = 'Core' | 'Necessary' | 'Fun' | 'Future' | 'Income';

/**
 * Category data
 * Matches backend CategoryData schema
 */
export interface Category {
    categories_id_pk: number;
    category_name: string;
    type: CategoryType;
    is_active: boolean | null;
    spending_type: SpendingType | null;
    created_at: string | null;
}

/**
 * Category insight for analytics
 */
export interface CategoryInsight {
    name: string;
    total: number;
    share_of_total: number;
}

/**
 * Category breakdown for charts
 */
export interface CategoryBreakdownData {
    category: string;
    total: number;
}

// ================================================================================================
//                                   Account Types
// ================================================================================================

/**
 * Account data
 * Matches backend AccountData schema
 */
export interface Account {
    accounts_id_pk: string;
    user_id_fk: string | null;
    account_name: string;
    type: string;
    currency: string | null;
    current_balance: number | null;
    net_flow_30d: number | null;
    created_at: string | null;
}

// ================================================================================================
//                                   Savings Fund Types
// ================================================================================================

/**
 * Savings fund data
 * Matches backend SavingsFundsData schema
 */
export interface SavingsFund {
    savings_funds_id_pk: string;
    user_id_fk: string;
    fund_name: string;
    target_amount: number;
    current_amount?: number;
    net_flow_30d?: number;
    created_at: string | null;
}

// ================================================================================================
//                                   Summary/Dashboard Types
// ================================================================================================

/**
 * Period comparison metrics for dashboard
 * Matches backend PeriodComparison schema
 */
export interface PeriodComparison {
    income_delta: number;
    income_delta_pct: number;
    expense_delta: number;
    expense_delta_pct: number;
    saving_delta_pct: number;
    investment_delta_pct: number;
    profit_delta_pct: number;
    cashflow_delta_pct: number;
}

/**
 * Dashboard summary data
 * Matches backend SummaryData schema
 */
export interface SummaryData {
    total_income: number;
    total_expense: number;
    total_saving: number;
    total_investment: number;
    profit: number;
    net_cash_flow: number;
    comparison: PeriodComparison;
    savings_rate: number;
    investment_rate: number;
    top_expenses: CategoryInsight[];
    biggest_mover: CategoryInsight | null;
    largest_transactions: Transaction[];
}

// ================================================================================================
//                                   Monthly Analytics Types
// ================================================================================================

/**
 * Daily spending data for heatmap
 */
export interface DailySpendingData {
    day: string;
    amount: number;
}

/**
 * Spending type breakdown data
 */
export interface SpendingTypeBreakdownData {
    type: string;
    amount: number;
}

/**
 * Run rate forecast data
 */
export interface RunRateForecast {
    average_daily_spend: number;
    projected_month_end_expenses: number;
    days_elapsed: number;
    days_remaining: number;
}

/**
 * Weekday vs weekend spending split
 */
export interface DaySplit {
    average_weekday_spend: number;
    average_weekend_spend: number;
}

/**
 * Category concentration insights
 */
export interface CategoryConcentration {
    top_3_share_pct: number;
    top_3_categories: CategoryBreakdownData[];
}

/**
 * Monthly period comparison
 * Matches backend MonthlyPeriodComparison schema
 */
export interface MonthlyPeriodComparison {
    income_delta: number;
    income_delta_pct: number;
    expenses_delta: number;
    expenses_delta_pct: number;
    savings_delta: number;
    savings_delta_pct: number;
    investments_delta: number;
    investments_delta_pct: number;
    profit_delta: number;
    profit_delta_pct: number;
    cashflow_delta: number;
    cashflow_delta_pct: number;
}

/**
 * Monthly analytics data
 * Matches backend MonthlyAnalyticsData schema
 */
export interface MonthlyAnalytics {
    year: number;
    month: number;
    month_name: string;
    income: number;
    expenses: number;
    savings: number;
    investments: number;
    profit: number;
    cashflow: number;
    run_rate: RunRateForecast;
    day_split: DaySplit;
    category_concentration: CategoryConcentration;
    comparison: MonthlyPeriodComparison;
    daily_spending_heatmap: DailySpendingData[];
    income_breakdown: CategoryBreakdownData[];
    expenses_breakdown: CategoryBreakdownData[];
    spending_type_breakdown: SpendingTypeBreakdownData[];
}

// ================================================================================================
//                                   Yearly Analytics Types
// ================================================================================================

/**
 * Month metric for highlights
 */
export interface MonthMetric {
    month: string;
    value: number;
}

/**
 * Yearly highlights data
 */
export interface YearlyHighlights {
    highest_cashflow_month: MonthMetric;
    highest_expense_month: MonthMetric;
    highest_savings_rate_month: MonthMetric;
}

/**
 * Volatility metrics (standard deviation)
 */
export interface VolatilityMetrics {
    expense_volatility: number;
    income_volatility: number;
}

/**
 * Yearly spending balance breakdown
 */
export interface YearlySpendingBalance {
    core_share_pct: number;
    fun_share_pct: number;
    future_share_pct: number;
}

/**
 * Yearly analytics data
 * Matches backend YearlyAnalyticsData schema
 */
export interface YearlyAnalyticsData {
    year: number;
    total_income: number;
    total_expense: number;
    total_saving: number;
    total_investment: number;
    total_core_expense: number;
    total_fun_expense: number;
    total_future_expense: number;
    profit: number;
    net_cash_flow: number;
    savings_rate: number;
    investment_rate: number;
    highlights: YearlyHighlights;
    volatility: VolatilityMetrics;
    spending_balance: YearlySpendingBalance;
    months: string[];
    monthly_income: number[];
    monthly_expense: number[];
    monthly_saving: number[];
    monthly_investment: number[];
    monthly_core_expense: number[];
    monthly_fun_expense: number[];
    monthly_future_expense: number[];
    monthly_savings_rate: number[];
    monthly_investment_rate: number[];
    by_category: Record<string, number>;
    core_categories: Record<string, number>;
    income_by_category: Record<string, number>;
    expense_by_category: Record<string, number>;
}

// ================================================================================================
//                                   Emergency Fund Types
// ================================================================================================

/**
 * Emergency fund analysis data
 * Matches backend EmergencyFundData schema
 */
export interface EmergencyFundData {
    year: number;

    // Core Expenses
    average_monthly_core_expenses: number;
    total_core_expenses: number;
    three_month_core_target: number;
    six_month_core_target: number;
    core_category_breakdown: Record<string, number>;

    // Core + Necessary Expenses
    average_monthly_core_necessary: number;
    total_core_necessary: number;
    three_month_core_necessary_target: number;
    six_month_core_necessary_target: number;

    // All Expenses (excluding Future)
    average_monthly_all_expenses: number;
    total_all_expenses: number;
    three_month_all_target: number;
    six_month_all_target: number;

    // Current State
    current_savings_amount: number;
    months_analyzed: number;
}

// ================================================================================================
//                                   UI Helper Types
// ================================================================================================

/**
 * Generic menu option for dropdowns/selects
 */
export interface MenuOption {
    name: string;
    value: string;
}
