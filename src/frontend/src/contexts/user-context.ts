import { createContext, useContext } from 'react';
import { ProfileData } from '@/lib/api/types';
import type { UpdateProfileRequest } from '@/lib/api/types/requests';
import type { AppLocale, DashboardTranslationKey } from '@/lib/i18n';

export interface UserContextType {
    profile: ProfileData | null;
    currency: string;
    locale: AppLocale;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (data: UpdateProfileRequest) => Promise<void>;
    formatCurrency: (amount: number) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatDate: (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
    formatMonth: (monthIndex: number, format?: 'long' | 'short') => string;
    t: (key: DashboardTranslationKey, params?: Record<string, string | number>) => string;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
