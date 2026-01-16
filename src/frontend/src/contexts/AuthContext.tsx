import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './auth-context';
import { tokenManager, authApi, ApiError } from '@/lib/api/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// AuthContext imported from ./auth-context

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check initial auth state
    const authenticated = tokenManager.isAuthenticated();
    setIsAuthenticated(authenticated);
    setUserId(tokenManager.getUserId());
    setIsLoading(false);
  }, []);

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
      const message = error instanceof ApiError && typeof error.detail === 'string' ? error.detail : 'Login failed';
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
      const message = error instanceof ApiError && typeof error.detail === 'string' ? error.detail : 'Registration failed';
      toast({
        title: 'Registration failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setIsAuthenticated(false);
    setUserId(null);
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        login,
        register,
        logout,
      }}
    >
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
