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

export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  profit: number;
  net_cash_flow: number;
}

export interface MonthlyAnalytics extends MonthlySummary {
  daily_spending_heatmap: Array<{ date: string; amount: number }>;
  category_breakdown: Array<{ category_id: string; category_name: string; amount: number; percentage: number }>;
  spending_type_breakdown: Array<{ spending_type: string; amount: number; percentage: number }>;
}

export interface YearlyAnalytics {
  year: number;
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  profit: number;
  net_cash_flow: number;
  monthly_income: number[];
  monthly_expenses: number[];
  monthly_savings: number[];
  category_breakdown: Array<{ category_id: string; category_name: string; amount: number; percentage: number }>;
}

export interface EmergencyFundAnalysis {
  year: number;
  recommended_3_month: number;
  recommended_6_month: number;
  core_category_breakdown: Array<{ category_name: string; amount: number }>;
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
  by_category: Record<string, number>;
}

export interface SummaryResponse {
  data: SummaryData;
  success: boolean;
  message: string;
}
