/**
 * Authentication API
 * Handles login, registration, and logout
 */

import { apiClient, tokenManager, ApiError } from '../client';
import type { MessageResponse } from '../types/responses';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * These auth calls run before there's a token to authenticate with, so they can't go through
 * `apiClient`/`request()` — this mirrors that function's error handling (string-`detail`
 * guard, `error_id` passthrough) so `getErrorMessage` behaves the same for auth failures as
 * for every other endpoint.
 */
async function parseAuthError(response: Response, fallback: string): Promise<ApiError> {
    const errorData = await response.json().catch(() => ({ detail: fallback }));
    const message = typeof errorData.detail === 'string' ? errorData.detail : fallback;
    return new ApiError(message, response.status, errorData.detail, errorData.error_id ?? undefined);
}

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
            throw await parseAuthError(response, 'Login failed');
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
            throw await parseAuthError(response, 'Registration failed');
        }

        const data = await response.json();
        tokenManager.setTokens(data.access_token, data.refresh_token, data.user_id);
        return data;
    },

    /**
     * Revokes the session server-side, then clears local tokens.
     *
     * The server call is best-effort: whatever happens, the tokens are dropped in `finally` so
     * a network failure can never trap the user in a logged-in state. Routed through
     * `apiClient` so an access token that is about to expire gets refreshed first.
     */
    logout: async () => {
        try {
            await apiClient.post<MessageResponse>('/auth/logout');
        } catch (error) {
            console.warn('Server-side logout failed; clearing local session anyway', error);
        } finally {
            tokenManager.clearTokens();
        }
    },

    forgotPassword: async (email: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            throw await parseAuthError(response, 'Request failed');
        }

        return await response.json();
    },

    resetPassword: async (accessToken: string, newPassword: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token: accessToken, new_password: newPassword }),
        });

        if (!response.ok) {
            throw await parseAuthError(response, 'Password reset failed');
        }

        return await response.json();
    },

    getGitHubOAuthUrl: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/oauth/github`, {
            method: 'GET',
            headers: {
                'X-API-KEY': API_KEY,
            },
        });

        if (!response.ok) {
            throw await parseAuthError(response, 'Failed to get OAuth URL');
        }

        return await response.json();
    },

    getGoogleOAuthUrl: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/oauth/google`, {
            method: 'GET',
            headers: {
                'X-API-KEY': API_KEY,
            },
        });

        if (!response.ok) {
            throw await parseAuthError(response, 'Failed to get OAuth URL');
        }

        return await response.json();
    },

    linkGitHub: async (accessToken: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/oauth/link-github`, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw await parseAuthError(response, 'Failed to link GitHub');
        }

        return await response.json();
    },

    linkGoogle: async (accessToken: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/oauth/link-google`, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_KEY,
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw await parseAuthError(response, 'Failed to link Google');
        }

        return await response.json();
    },
};
