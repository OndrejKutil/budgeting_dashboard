import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { useUser } from '@/contexts/user-context';
import { isNativeApp } from '@/lib/native/budgetNative';
import { loadNativeData } from '@/lib/native/data';
import { NOTIFICATION_PREFS_EVENT, cancelScheduledNotifications, syncNotifications } from '@/lib/native/notifications';
import { clearWidgets, syncWidgets } from '@/lib/native/widgets';

/** After a save (transaction, recurring payment, import…), wait this long so bursts sync once. */
const AFTER_MUTATION_MS = 3000;

/**
 * Native iOS app only: keeps the widgets' data and the scheduled local notifications in line with
 * the user's data and settings. Syncs on login, when the app returns to the foreground, after any
 * successful save and when a setting changes; clears both on logout. Renders nothing, and does
 * nothing in browsers and the PWA.
 */
export function NativeSync() {
  const { isAuthenticated } = useAuth();
  const { t, isLoading, locale, currency } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const queryClient = useQueryClient();
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!isNativeApp()) return;

    const sync = async () => {
      if (!isAuthenticated) {
        await cancelScheduledNotifications();
        await clearWidgets();
        return;
      }
      const data = await loadNativeData(currency, {
        fallbackName: t('profile.notifyDueFallbackName'),
        accounts: (count) => t('profile.widgetAccountCount', { count }),
        noGroup: (code) => t('profile.widgetNoGroup', { currency: code }),
      });
      await syncNotifications(t, isPrivacyMode, data);
      await syncWidgets(data, { t, locale, privacyMode: isPrivacyMode });
    };
    // Serialized so two syncs never interleave their cancel/schedule calls.
    const run = () => {
      queue.current = queue.current.then(sync).catch((error) => console.warn('Native sync failed', error));
    };

    if (!isAuthenticated || !isLoading) run();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(NOTIFICATION_PREFS_EVENT, run);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation.state.status === 'success' && isAuthenticated) {
        clearTimeout(timer);
        timer = setTimeout(run, AFTER_MUTATION_MS);
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(NOTIFICATION_PREFS_EVENT, run);
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isAuthenticated, isLoading, isPrivacyMode, t, locale, currency, queryClient]);

  return null;
}
