import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PrivacyContext } from './privacy-context';

const PRIVACY_MODE_KEY = 'budget-dashboard:privacy-mode';

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PRIVACY_MODE_KEY) === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(PRIVACY_MODE_KEY, String(isPrivacyMode));
  }, [isPrivacyMode]);

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((current) => !current);
  }, []);

  const value = useMemo(() => ({
    isPrivacyMode,
    togglePrivacyMode,
  }), [isPrivacyMode, togglePrivacyMode]);

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
}
