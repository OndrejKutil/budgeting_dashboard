import { createContext, useContext } from 'react';
import { ProfileData } from '@/lib/api/types';

export interface UserContextType {
    profile: ProfileData | null;
    currency: string;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (data: { full_name?: string; currency?: string }) => Promise<void>;
    formatCurrency: (amount: number) => string;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
