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
  created_at: string | null;
}

export interface SavingsFund {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  last_sign_in_at?: string;
  created_at: string;
  user_metadata?: Record<string, unknown>;
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

export interface Summary {
  start_date: string;
  end_date: string;
  total_income: number;
  total_expenses: number;
  total_savings: number;
  total_investments: number;
  net_change: number;
}
