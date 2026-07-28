import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './auth-context';
import { ensureFreshAccessToken, tokenManager, getErrorMessage, SESSION_EXPIRED_EVENT } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// The localStorage key the api client stores the access token under. Watched so a logout in one
// tab propagates to the others.
const ACCESS_TOKEN_STORAGE_KEY = 'finance_access_token';

// AuthContext imported from ./auth-context

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Read inside listeners that must not re-subscribe on every auth state change.
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  /**
   * Drops React auth state and all cached server data. Deliberately does *not* touch stored
   * tokens — `logout` still needs them to authenticate the revocation call, and the expiry and
   * cross-tab paths reach here only after the tokens are already gone.
   *
   * Clearing the query cache matters: without it, the next account to log in on this browser
   * would briefly render the previous user's transactions from cache.
   */
  const clearAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setUserId(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      const hasStoredSession = tokenManager.isAuthenticated();

      if (!hasStoredSession) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setUserId(null);
          setIsLoading(false);
        }
        return;
      }

      const hasFreshToken = await ensureFreshAccessToken();

      if (!cancelled) {
        setIsAuthenticated(hasFreshToken && tokenManager.isAuthenticated());
        setUserId(tokenManager.getUserId());
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // The api client clears tokens when a refresh fails, but it cannot touch React state. Without
  // this the dashboard kept rendering with no valid token until the user reloaded by hand.
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticatedRef.current) return;

      clearAuthState();
      toast({
        title: 'Session expired',
        description: 'Please log in again to continue.',
      });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [clearAuthState]);

  // Propagate a logout (or an expiry handled by another tab) to every open tab. `storage` only
  // fires in tabs other than the one that made the change, so this never double-handles.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ACCESS_TOKEN_STORAGE_KEY) return;
      if (event.newValue !== null) return;
      if (!isAuthenticatedRef.current) return;

      clearAuthState();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      setIsAuthenticated(true);
      setUserId(response.user_id);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
    } catch (error) {
      const message = getErrorMessage(error, 'Login failed');
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const response = await authApi.register(email, password, fullName);
      setIsAuthenticated(true);
      setUserId(response.user_id);
      toast({
        title: 'Account created!',
        description: 'Welcome to your personal finance dashboard.',
      });
    } catch (error) {
      const message = getErrorMessage(error, 'Registration failed');
      toast({
        title: 'Registration failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    // Tear down local state first so the UI responds immediately. The tokens stay in storage
    // until `authApi.logout` has used them to revoke the session server-side; it clears them in
    // a `finally` and never rejects.
    clearAuthState();
    await authApi.logout();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  }, [clearAuthState]);

  /**
   * Drops the local session without calling the server. For cases where there is nothing left
   * to revoke — chiefly after the account itself has been deleted.
   */
  const clearLocalSession = useCallback(() => {
    tokenManager.clearTokens();
    clearAuthState();
  }, [clearAuthState]);

  const value = useMemo(() => ({
    isAuthenticated,
    isLoading,
    userId,
    login,
    register,
    logout,
    clearLocalSession,
  }), [isAuthenticated, isLoading, userId, login, register, logout, clearLocalSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

import { useAuth } from './auth-context';

// Protected route wrapper
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
