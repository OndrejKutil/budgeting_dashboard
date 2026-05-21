import { createContext, useContext } from 'react';

export interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
}

export const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function usePrivacyMode() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacyMode must be used within a PrivacyModeProvider');
  }
  return context;
}
