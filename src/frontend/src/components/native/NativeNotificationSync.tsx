import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { useUser } from '@/contexts/user-context';
import { isNativeApp } from '@/lib/native/budgetNative';
import {
  NOTIFICATION_PREFS_EVENT,
  cancelScheduledNotifications,
  syncNotifications,
} from '@/lib/native/notifications';

/**
 * Native iOS app only: keeps the scheduled local notifications in line with the user's data and
 * settings. Re-syncs on login, when the app returns to the foreground and when a setting changes;
 * clears everything on logout. Renders nothing and does nothing in browsers and the PWA.
 */
export function NativeNotificationSync() {
  const { isAuthenticated } = useAuth();
  const { t, isLoading } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!isNativeApp()) return;

    const run = () => {
      // Serialize syncs so two of them never interleave cancel/schedule calls.
      queue.current = queue.current
        .then(() => (isAuthenticated ? syncNotifications(t, isPrivacyMode) : cancelScheduledNotifications()))
        .catch((error) => console.warn('Notification sync failed', error));
    };

    if (!isAuthenticated || !isLoading) run();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(NOTIFICATION_PREFS_EVENT, run);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(NOTIFICATION_PREFS_EVENT, run);
    };
  }, [isAuthenticated, isLoading, isPrivacyMode, t]);

  return null;
}
