/**
 * API Client with automatic token refresh and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'finance_access_token';
const REFRESH_TOKEN_KEY = 'finance_refresh_token';
const USER_ID_KEY = 'finance_user_id';

// Token management
export const tokenManager = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUserId: () => localStorage.getItem(USER_ID_KEY),
  
  setTokens: (accessToken: string, refreshToken: string, userId?: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (userId) localStorage.setItem(USER_ID_KEY, userId);
  },
  
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  },
  
  isAuthenticated: () => !!localStorage.getItem(ACCESS_TOKEN_KEY),
};

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class TokenExpiredError extends ApiError {
  constructor() {
    super('Token expired', 498, 'Token expired');
    this.name = 'TokenExpiredError';
  }
}

// Response types
interface ApiResponse<T> {
  data: T;
  status: number;
}

interface RefreshResponse {
  session: {
    access_token: string;
    refresh_token: string;
  };
}

// Refresh token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/refresh/`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'X-Refresh-Token': refreshToken,
      },
    });

    if (!response.ok) {
      tokenManager.clearTokens();
      return false;
    }

    const data: RefreshResponse = await response.json();
    tokenManager.setTokens(
      data.session.access_token,
      data.session.refresh_token
    );
    return true;
  } catch {
    tokenManager.clearTokens();
    return false;
  }
}

// Main request function
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnExpired = true
): Promise<ApiResponse<T>> {
  const accessToken = tokenManager.getAccessToken();
  
  const headers: HeadersInit = {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token expiration
  if (response.status === 498 && retryOnExpired) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(endpoint, options, false);
    }
    throw new TokenExpiredError();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(
      errorData.detail || 'Request failed',
      response.status,
      errorData.detail
    );
  }

  const data = await response.json();
  return { data, status: response.status };
}

// API client methods
export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return request<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// Auth-specific functions (no bearer token needed)
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new ApiError(errorData.detail || 'Login failed', response.status, errorData.detail);
    }

    const data = await response.json();
    tokenManager.setTokens(data.access_token, data.refresh_token, data.user_id);
    return data;
  },

  register: async (email: string, password: string, fullName?: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
      throw new ApiError(errorData.detail || 'Registration failed', response.status, errorData.detail);
    }

    const data = await response.json();
    tokenManager.setTokens(data.access_token, data.refresh_token, data.user_id);
    return data;
  },

  logout: () => {
    tokenManager.clearTokens();
  },
};

// Categories API
import type { Category, Account, Transaction, TransactionsResponse } from './types';

interface CategoriesResponse {
  data: Category[];
  count: number;
}

export const categoriesApi = {
  getAll: async (params?: { category_id?: number; category_name?: string }) => {
    const response = await apiClient.get<CategoriesResponse>(
      '/categories/',
      params as Record<string, string | number | undefined>
    );
    return response.data;
  },
};

// Accounts API
interface AccountsResponse {
  data: Account[];
  count: number;
  success: boolean;
  message: string;
}

export const accountsApi = {
  getAll: async (params?: { account_id?: string; account_name?: string }) => {
    const response = await apiClient.get<AccountsResponse>(
      '/accounts/',
      params as Record<string, string | number | undefined>
    );
    return response.data;
  },

  create: async (account: { account_name: string; type: string; currency: string }) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/accounts/',
      account
    );
    return response.data;
  },

  update: async (accountId: string, account: { account_name: string; type: string; currency: string }) => {
    const response = await apiClient.put<{ success: boolean; message: string }>(
      `/accounts/${accountId}`,
      account
    );
    return response.data;
  },

  delete: async (accountId: string) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/accounts/${accountId}`
    );
    return response.data;
  },
};

// Transactions API
interface TransactionCreateUpdate {
  account_id_fk: string;
  category_id_fk: number;
  amount: number;
  date: string;
  notes?: string | null;
  savings_fund_id_fk?: string | null;
}

export const transactionsApi = {
  getAll: async (params?: {
    start_date?: string;
    end_date?: string;
    category_id?: string;
    account_id?: string;
    transaction_id?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get<TransactionsResponse>(
      '/transactions/',
      params as Record<string, string | number | undefined>
    );
    return response.data;
  },

  create: async (transaction: TransactionCreateUpdate) => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Transaction[] }>(
      '/transactions/',
      transaction
    );
    return response.data;
  },

  update: async (transactionId: string, transaction: TransactionCreateUpdate) => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Transaction[] }>(
      `/transactions/${transactionId}`,
      transaction
    );
    return response.data;
  },

  delete: async (transactionId: string) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/transactions/${transactionId}`
    );
    return response.data;
  },
};
