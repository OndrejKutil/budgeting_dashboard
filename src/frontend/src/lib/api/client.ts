/**
 * API Client Core
 * Contains the base HTTP client, token management, and error handling.
 * API endpoint functions have been moved to ./endpoints/
 */

import type { RefreshResponse, ApiResponse } from './types/responses';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'finance_access_token';
const REFRESH_TOKEN_KEY = 'finance_refresh_token';
const USER_ID_KEY = 'finance_user_id';

// ============================================
// Token Management
// ============================================
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

// ============================================
// Error Types
// ============================================
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown
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

// ============================================
// Token Refresh
// ============================================
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) return false;

  // If a refresh is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/refresh/`, {
        method: 'POST',
        headers: {
          'X-API-KEY': API_KEY,
          'X-Refresh-Token': refreshToken,
        },
      });

      if (!response.ok) {
        // Multi-tab resilience:
        // If the request failed (e.g., 500 "Already Used"), check if another tab has already refreshed it.
        const cloneRefreshToken = tokenManager.getRefreshToken();
        if (cloneRefreshToken && cloneRefreshToken !== refreshToken) {
          // Token changed while we were waiting? Success!
          return true;
        }

        tokenManager.clearTokens();
        return false;
      }

      const data: RefreshResponse = await response.json();
      tokenManager.setTokens(
        data.data.access_token,
        data.data.refresh_token,
        data.data.id
      );
      return true;
    } catch (error) {
      // Network error or other crash
      // Check if token changed anyway (race condition success)
      const cloneRefreshToken = tokenManager.getRefreshToken();
      if (cloneRefreshToken && cloneRefreshToken !== refreshToken) {
        return true;
      }

      tokenManager.clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================
// Main Request Function
// ============================================
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
    const refreshed: boolean = await refreshAccessToken();
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

// ============================================
// API Client Methods
// ============================================
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

// Re-export all endpoint APIs for convenience
// Yes it would be cleaner to update all imports ('@/lib/api/client') to use the endpoints directly
// But I don't want to do that now
// TODO: Update all imports to use the endpoints directly
// then remove this line
export * from './endpoints';
