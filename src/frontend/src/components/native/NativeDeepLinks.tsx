import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRANSACTIONS_PATH } from '@/components/layout/nav-config';
import type { OpenAddState } from '@/hooks/use-add-transaction';
import { BudgetNative, isNativeApp } from '@/lib/native/budgetNative';

/**
 * Native iOS app only: follows widget taps and controls (deep links). `add` opens the Add
 * transaction dialog the same way the dock's + does; anything else is a /dashboard path.
 * Logged-out users end up on the login page through RequireAuth as usual.
 */
export function NativeDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    const handle = BudgetNative.addListener('deepLink', ({ target }) => {
      if (target === 'add') {
        const state: OpenAddState = { openAdd: true };
        navigate(TRANSACTIONS_PATH, { state });
      } else if (target === '/dashboard' || target.startsWith('/dashboard/')) {
        navigate(target);
      }
    });
    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, [navigate]);

  return null;
}
