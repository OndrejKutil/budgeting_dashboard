import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserContext } from './user-context';
import { useAuth } from './auth-context';
import { profileApi } from '@/lib/api/endpoints';
import { ProfileData } from '@/lib/api/types';
import type { UpdateProfileRequest } from '@/lib/api/types/requests';
import { DEFAULT_LOCALE, isAppLocale, translate } from '@/lib/i18n';
import type { AppLocale, DashboardTranslationKey } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';
import { formatMoney } from '@/lib/currency';

// UserContext imported from ./user-context

const DEFAULT_CURRENCY = 'CZK'; // Setting default to CZK

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { userId, isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
    const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const response = await profileApi.getMe();
            if (response.success) {
                setProfile(response.data);
                // Extract currency from user metadata, default to global default
                const userCurrency = (response.data.user_metadata?.currency as string) || DEFAULT_CURRENCY;
                const userLocale = response.data.user_metadata?.locale;
                setCurrency(userCurrency);
                setLocale(isAppLocale(userLocale) ? userLocale : DEFAULT_LOCALE);
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
            setLocale(DEFAULT_LOCALE);
            setIsLoading(false);
        }
    }, [isAuthenticated, fetchProfile]);

    const t = useCallback((key: DashboardTranslationKey, params?: Record<string, string | number>) => {
        return translate(locale, key, params);
    }, [locale]);

    const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
        try {
            const response = await profileApi.updateProfile(data);
            if (response.success) {
                setProfile(response.data);
                if (data.currency) {
                    setCurrency(data.currency);
                }
                if (isAppLocale(data.locale)) {
                    setLocale(data.locale);
                }
                const nextLocale = isAppLocale(data.locale) ? data.locale : locale;
                toast({ title: translate(nextLocale, 'context.profileUpdated') });
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({
                title: translate(locale, 'context.updateFailed'),
                description: translate(locale, 'context.updateFailedDescription'),
                variant: 'destructive'
            });
            throw error;
        }
    }, [locale]);

    const formatCurrency = useCallback((amount: number) => {
        return formatMoney(amount, currency);
    }, [currency]);

    const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
        return new Intl.NumberFormat(locale, options).format(value);
    }, [locale]);

    const formatDate = useCallback((date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
        if (!date) return '';
        return new Intl.DateTimeFormat(locale, options ?? {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(date));
    }, [locale]);

    const formatMonth = useCallback((monthIndex: number, format: 'long' | 'short' = 'long') => {
        return new Intl.DateTimeFormat(locale, { month: format }).format(new Date(2026, monthIndex, 1));
    }, [locale]);

    const value = useMemo(() => ({
        profile,
        currency,
        locale,
        isLoading,
        refreshProfile: fetchProfile,
        updateProfile,
        formatCurrency,
        formatNumber,
        formatDate,
        formatMonth,
        t,
    }), [profile, currency, locale, isLoading, fetchProfile, updateProfile, formatCurrency, formatNumber, formatDate, formatMonth, t]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

import { useUser } from './user-context';
