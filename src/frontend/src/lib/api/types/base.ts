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
        locale?: string;
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
 * Transaction tag
 * Matches backend TagData schema
 */
export interface Tag {
    tags_id_pk: number;
    tag_name: string;
}

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
    import_batch_id_fk?: string | null;
    tags?: Tag[];
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
    account_is_active?: boolean;
    account_group_id_fk: string | null;
    current_balance: number | null;
    current_balance_base?: number | null;
    net_flow_mtd: number | null;
    net_flow_mtd_base?: number | null;
    history_30d?: { date: string; balance: number }[];
    created_at: string | null;
}

/**
 * Account group -- a user-defined label tying together several accounts
 * (e.g. one bank account held in multiple currencies).
 * Matches backend AccountGroupData schema
 */
export interface AccountGroup {
    account_groups_id_pk: string;
    user_id_fk: string | null;
    group_name: string;
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
    fund_is_active?: boolean;
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
 * Average monthly totals over the (up to) six months before the requested month.
 * Matches backend SixMonthAverage schema
 */
export interface SixMonthAverage {
    months_counted: number;
    income: number;
    expense: number;
    saving: number;
    investment: number;
    profit: number;
    net_cash_flow: number;
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
    /** All expense categories of the period, largest first. */
    expense_categories: CategoryInsight[];
    /** Cumulative expenses by day of month (index 0 = day 1); ends today for the current month. */
    daily_cumulative_expense: number[];
    /** Average cumulative expenses over the previous six months, one value per day of the month. Empty without history. */
    average_daily_cumulative_expense: number[];
    /** Null without history. */
    six_month_average: SixMonthAverage | null;
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
 * Average monthly totals over the (up to) six months before the requested month
 * Matches backend MonthlySixMonthAverage schema
 */
export interface MonthlySixMonthAverage {
    months_counted: number;
    income: number;
    expenses: number;
    savings: number;
    investments: number;
    profit: number;
    cashflow: number;
    /** Percent of income; null when none of the counted months had income */
    savings_rate: number | null;
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
    savings_rate: number;
    investment_rate: number;
    run_rate: RunRateForecast;
    day_split: DaySplit;
    category_concentration: CategoryConcentration;
    comparison: MonthlyPeriodComparison;
    six_month_average: MonthlySixMonthAverage | null;
    daily_spending_heatmap: DailySpendingData[];
    income_breakdown: CategoryBreakdownData[];
    expenses_breakdown: CategoryBreakdownData[];
    saving_breakdown: CategoryBreakdownData[];
    investment_breakdown: CategoryBreakdownData[];
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
 * Single trend direction metric
 */
export interface TrendDirectionItem {
    direction: 'growing' | 'stable' | 'declining';
    avg_monthly_change_pct: number;
}

/**
 * Trend direction metrics
 */
export interface TrendDirectionMetrics {
    income_trend: TrendDirectionItem;
    savings_rate_trend: TrendDirectionItem;
    core_expense_trend: TrendDirectionItem;
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
    trend_directions: TrendDirectionMetrics;
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
    saving_by_category: Record<string, number>;
    investment_by_category: Record<string, number>;
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
//                                   Recurring Transaction Types
// ================================================================================================

export type RecurringCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Recurring {
    recurring_id_pk: string;
    user_id_fk: string | null;
    account_id_fk: string;
    category_id_fk: number;
    savings_fund_id_fk: string | null;
    amount: number;
    cadence: RecurringCadence;
    next_date: string;
    notes: string | null;
    is_active: boolean | null;
    /** Posted automatically by the daily job when due (see fct_recurring_postings). */
    auto_post: boolean;
    created_at: string | null;
    updated_at: string | null;
}

/** An occurrence the daily job posted automatically and the user hasn't dismissed yet. */
export interface RecurringNotification {
    posting_id: string;
    recurring_id: string;
    transaction_id: string;
    occurrence_date: string;
    posted_at: string;
    /** The posted transaction as it is now, tags included (same shape as a transactions-list row). */
    transaction: Transaction;
}

export interface RecurringSummary {
    monthly_total: number;
    annual_total: number;
    base_currency: string;
}

// ================================================================================================
//                                   Net Worth Types
// ================================================================================================

/**
 * The latest Trading212 portfolio value folded into the net-worth headline.
 * Matches backend InvestmentContribution schema.
 */
export interface InvestmentContribution {
    total_value: number;
    synced_at: string;
    is_stale: boolean;
}

export interface NetWorthTimeline {
    dates: string[];
    net_worth: number[];
    base_currency: string;
    investments: InvestmentContribution | null;
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

// ================================================================================================
//                                   Dividend Calculator Types
// ================================================================================================

/**
 * Dividend yield frequency
 */
export type DividendYieldFrequency = 'annual' | 'quarterly' | 'monthly';

/**
 * A single stock row in the dividend portfolio
 * Matches backend DividendStockRow schema
 */
export interface DividendStockRow {
    ticker: string;
    weight_pct: number;
    dividend_yield: number;
    yield_frequency: DividendYieldFrequency;
}

/**
 * Computed dividend calculation result returned from backend GET
 * Matches backend DividendCalculationResult schema
 */
export interface DividendCalculationResult {
    weighted_avg_yield: number;
    annual_income: number;
    monthly_income: number;
    portfolio_value: number;
    rows: DividendStockRow[];
}

// ================================================================================================
//                                   Feature Flags
// ================================================================================================

/**
 * A single feature and whether it is enabled for the current user
 * Matches backend FeatureFlagData schema
 */
export interface FeatureFlag {
    feature_key: string;
    feature_name: string;
    feature_description: string | null;
    is_enabled: boolean;
}

// ================================================================================================
//                                   Screenshot Import
// ================================================================================================

/**
 * Where a draft field's value came from.
 * Matches backend FieldSource enum — drives the per-field provenance badges in the review UI.
 */
export type FieldSource = 'rule' | 'model' | 'default' | 'none';

/**
 * One proposed transaction extracted from a screenshot.
 * Nothing here is final: the category is a best guess. There is no separate merchant field --
 * the app doesn't store one on a real transaction, so the merchant name is prefilled into
 * `notes` instead.
 * Matches backend DraftTransactionData schema
 */
export interface DraftTransaction {
    amount: number | null;
    currency: string | null;
    date: string | null;
    account_id_fk: string | null;
    category_id_fk: number | null;
    notes: string | null;
    savings_fund_id_fk: string | null;
    /** IDs of the user's existing tags */
    tags: number[];
    /** Tags the user asked for that don't exist yet -- created by the client at import time */
    new_tag_names: string[];
    confidence: number;
    field_sources: Partial<Record<keyof DraftTransaction, FieldSource>>;
    warnings: string[];
}

/**
 * Why a screenshot produced no drafts, reported by the vision model itself
 * Matches backend NoTransactionsReason enum
 *
 * Each value needs a matching `pages.screenshotImport.reason.<value>` key in every language;
 * without one the UI falls back to the generic empty state.
 */
export type NoTransactionsReason =
    | 'unreadable'
    | 'not_a_transaction_screenshot'
    | 'only_grouped_notifications'
    | 'no_transactions_visible';

/**
 * Result of one screenshot extraction, plus how it was produced
 * Matches backend ExtractionData schema
 */
export interface ExtractionData {
    drafts: DraftTransaction[];
    inference_model: string | null;
    inference_called: boolean;
    rules_hit: number;
    raw_text: string | null;
    /** Only set when drafts is empty — null whenever anything was extracted */
    reason: NoTransactionsReason | null;
}

// ================================================================================================
//                                   Trading212 Integration
// ================================================================================================

/** Matches backend T212SyncStatus enum. null means no sync has been attempted yet. */
export type T212SyncStatus = 'ok' | 'auth_failed' | 'rate_limited' | 'error' | null;

/**
 * GET /trading212/connection. Never includes the key/secret, not even masked.
 * Matches backend T212ConnectionData schema.
 */
export interface T212Connection {
    connected: boolean;
    last_synced_at: string | null;
    last_sync_status: T212SyncStatus;
    account_currency: string | null;
}

/**
 * One open position from the latest synced snapshot.
 * Matches backend T212PositionData schema.
 *
 * Two denominations, deliberately: the per-share prices are in the instrument's own quote
 * currency (`instrument_currency`), while `market_value` and `unrealised_pnl` are converted to
 * the base currency the request asked for (`T212Positions.currency`). Formatting every field
 * with the base currency is the bug this split exists to prevent.
 */
export interface T212Position {
    ticker: string;
    quantity: number;
    /** In `instrument_currency`, NOT the base currency. */
    average_price: number;
    /** In `instrument_currency`, NOT the base currency. */
    current_price: number;
    market_value: number;
    unrealised_pnl: number;
    /** Quote currency of the two price fields; null when it couldn't be resolved. */
    instrument_currency: string | null;
    weight_pct: number;
}

/** Matches backend T212PositionsData schema. */
export interface T212Positions {
    positions: T212Position[];
    synced_at: string | null;
    /** Currency market_value / unrealised_pnl are converted to (the caller's base currency). */
    currency: string | null;
}

/** One row from fct_t212_value_history. Matches backend T212ValueHistoryPoint schema. */
export interface T212ValueHistoryPoint {
    snapshot_at: string;
    total_value: number;
}

/** Matches backend T212HistoryData schema. */
export interface T212History {
    points: T212ValueHistoryPoint[];
    /** Currency total_value is converted to (the caller's base currency). */
    currency: string | null;
}

/** Query span for GET /trading212/history. */
export type T212HistorySpan = '7d' | '1m' | '3m' | 'ytd' | '1y' | 'all';

// ================================================================================================
//                                   Statement Import (CSV / XLSX)
// ================================================================================================

/** Mirrors backend StatementMapping: which columns of a bank export mean what. */
export interface StatementMapping {
    date_column: string;
    /** strptime pattern; null = auto-detect. */
    date_format: string | null;
    amount_column: string | null;
    debit_column: string | null;
    credit_column: string | null;
    decimal_separator: ',' | '.';
    currency_column: string | null;
    merchant_columns: string[];
    message_columns: string[];
    own_account_column: string | null;
}

/** A recognised bank export format. */
export interface StatementPresetData {
    key: string;
    name: string;
}

/** One parsed statement row, ready for review. Dates are YYYY-MM-DD. */
export interface StatementDraftRow {
    row_number: number;
    date: string | null;
    amount: number | null;
    merchant: string;
    merchant_key: string;
    notes: string;
    category_id_fk: number | null;
    category_source: FieldSource;
    duplicate: boolean;
    warning: string | null;
    error: string | null;
    /** Money moved to / from the account holder themselves (counterparty is the holder's own name). */
    own_transfer: boolean;
}

/** Result of POST /statement-import/preview. */
export interface StatementPreviewData {
    needs_mapping: boolean;
    headers: string[];
    sample_rows: string[][];
    mapping: StatementMapping | null;
    preset: StatementPresetData | null;
    rows: StatementDraftRow[];
    date_from: string | null;
    date_to: string | null;
    currency: string | null;
    suggestions_available: boolean;
    /** The user opted out of AI suggestions; only history suggestions exist. */
    ai_skipped: boolean;
}

/** One past import (a row of fct_import_batches). */
export interface ImportBatchData {
    import_batch_id_pk: string;
    account_id_fk: string;
    file_name: string | null;
    preset: string | null;
    mapping_json: Record<string, unknown> | null;
    row_count: number;
    date_from: string | null;
    date_to: string | null;
    created_at: string | null;
}

/** Result of POST /statement-import/commit. */
export interface StatementCommitData {
    batch: ImportBatchData;
    rows_written: number;
    balance_adjustment: number | null;
    /** Savings fund id -> opening amount added (non-zero ones only). */
    fund_adjustments: Record<string, number>;
}
