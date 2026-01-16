import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { profileApi } from '@/lib/api/client';
import { ProfileData } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

interface UserContextType {
    profile: ProfileData | null;
    currency: string;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (data: { full_name?: string; currency?: string }) => Promise<void>;
    formatCurrency: (amount: number) => string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const DEFAULT_CURRENCY = 'CZK'; // Setting default to CZK

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { userId, isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const response = await profileApi.getMe();
            if (response.success) {
                setProfile(response.data);
                // Extract currency from user metadata, default to global default
                const userCurrency = (response.data.user_metadata?.currency as string) || DEFAULT_CURRENCY;
                setCurrency(userCurrency);
            }
        } catch (error) {
            console.error('Failed to fetch profile in UserProvider:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchProfile();
        } else {
            setProfile(null);
            setCurrency(DEFAULT_CURRENCY);
            setIsLoading(false);
        }
    }, [isAuthenticated, fetchProfile]);

    const updateProfile = async (data: { full_name?: string; currency?: string }) => {
        try {
            const response = await profileApi.updateProfile(data);
            if (response.success) {
                setProfile(response.data);
                if (data.currency) {
                    setCurrency(data.currency);
                }
                toast({ title: 'Profile updated successfully' });
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({
                title: 'Update failed',
                description: 'Could not update profile settings',
                variant: 'destructive'
            });
            throw error;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(currency === 'CZK' ? 'cs-CZ' : 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currency === 'CZK' ? 2 : 2,
            maximumFractionDigits: currency === 'CZK' ? 2 : 2,
        }).format(amount);
    };

    return (
        <UserContext.Provider
            value={{
                profile,
                currency,
                isLoading,
                refreshProfile: fetchProfile,
                updateProfile,
                formatCurrency,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
