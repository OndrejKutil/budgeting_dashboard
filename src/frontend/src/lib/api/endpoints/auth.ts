/**
 * Authentication API
 * Handles login, registration, and logout
 */

import { tokenManager, ApiError } from '../client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

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
