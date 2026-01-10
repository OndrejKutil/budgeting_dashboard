// API Response Types based on API_ENDPOINTS.md

export interface User {
  id: string;
  email: string;
  role?: string;
  aud?: string;
  email_confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
}

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

export interface TransactionsResponse {
  data: Transaction[];
  count: number;
  success: boolean;
  message: string;
}

export interface Category {
  categories_id_pk: number;
  category_name: string;
  type: 'expense' | 'income' | 'transfer' | 'saving' | 'investment' | 'exclude';
  is_active: boolean | null;
  spending_type: 'Core' | 'Necessary' | 'Fun' | 'Future' | 'Income' | null;
  created_at: string | null;
}

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

export interface SavingsFund {
  savings_funds_id_pk: string;
  user_id_fk: string;
  fund_name: string;
  target_amount: number;
  current_amount?: number;
  net_flow_30d?: number;
  created_at: string | null;
}

export interface SavingsFundRequest {
  user_id_fk: string;
  fund_name: string;
  target_amount: number;
  created_at?: string | null;
}

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

export interface UpdateProfileRequest {
  full_name?: string;
  currency?: string;
}

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
    [key: string]: unknown;
  } | null;
  identities: IdentityData[] | null;
  factors: Record<string, unknown>[] | null;
  action_link: string | null;
}

export interface ProfileResponse {
  data: ProfileData;
  success: boolean;
  message: string;
}

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

export interface DailySpendingData {
  day: string;
  amount: number;
}

export interface CategoryBreakdownData {
  category: string;
  total: number;
}

export interface SpendingTypeBreakdownData {
  type: string;
  amount: number;
}

export interface RunRateForecast {
  average_daily_spend: number;
  projected_month_end_expenses: number;
  days_elapsed: number;
  days_remaining: number;
}

export interface DaySplit {
  average_weekday_spend: number;
  average_weekend_spend: number;
}

export interface CategoryConcentration {
  top_3_share_pct: number;
  top_3_categories: CategoryBreakdownData[];
}

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

export interface MonthlyAnalyticsResponse {
  data: MonthlyAnalytics;
  success: boolean;
  message: string;
}


export interface MenuOption {
  name: string;
  value: string;
}

export interface MonthMetric {
  month: string;
  value: number;
}

export interface YearlyHighlights {
  highest_cashflow_month: MonthMetric;
  highest_expense_month: MonthMetric;
  highest_savings_rate_month: MonthMetric;
}

export interface VolatilityMetrics {
  expense_volatility: number;
  income_volatility: number;
}

export interface YearlySpendingBalance {
  core_share_pct: number;
  fun_share_pct: number;
  future_share_pct: number;
}

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

export interface YearlyAnalyticsResponse {
  data: YearlyAnalyticsData;
  success: boolean;
  message: string;
}

export interface EmergencyFundData {
  year: number;

  // Core
  average_monthly_core_expenses: number;
  total_core_expenses: number;
  three_month_core_target: number;
  six_month_core_target: number;
  core_category_breakdown: Record<string, number>;

  // Core + Necessary
  average_monthly_core_necessary: number;
  total_core_necessary: number;
  three_month_core_necessary_target: number;
  six_month_core_necessary_target: number;

  // All
  average_monthly_all_expenses: number;
  total_all_expenses: number;
  three_month_all_target: number;
  six_month_all_target: number;

  // Current
  current_savings_amount: number;
  months_analyzed: number;
}

export interface EmergencyFundResponse {
  data: EmergencyFundData;
  success: boolean;
  message: string;
}


export interface PeriodComparison {
  income_delta: number;
  income_delta_pct: number;
  expense_delta: number;
  expense_delta_pct: number;
  saving_delta: number;
  investment_delta: number;
  profit_delta: number;
  profit_delta_pct: number;
  cashflow_delta: number;
  cashflow_delta_pct: number;
}

export interface CategoryInsight {
  name: string;
  total: number;
  share_of_total: number;
}

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

export interface SummaryResponse {
  data: SummaryData;
  success: boolean;
  message: string;
}
