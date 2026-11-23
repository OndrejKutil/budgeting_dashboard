import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import {
  BudgetNative,
  PROVISIONING_CHANGED_EVENT,
  isNativeApp,
  isNativeCancel,
  type NativeAppSettings,
} from '@/lib/native/budgetNative';
import {
  ensureNotificationPermission,
  getNotificationPrefs,
  sendTestNotification,
  setNotificationPref,
  type NotificationKind,
  type NotificationPrefs,
} from '@/lib/native/notifications';

export const LOCK_TIMEOUT_OPTIONS = [0, 60, 5 * 60, 15 * 60, 60 * 60] as const;
export const PAGE_ZOOM_OPTIONS = [0.75, 0.8, 0.85, 0.9, 1, 1.1] as const;

/**
 * State and actions for the profile page's "App" section. Only meaningful in the native iOS app;
 * `available` is false everywhere else and nothing is called.
 */
export function useNativeAppSettings() {
  const { t } = useUser();
  const available = isNativeApp();
  const [settings, setSettings] = useState<NativeAppSettings | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const [busy, setBusy] = useState(false);
  const [expiryTest, setExpiryTest] = useState(false);

  useEffect(() => {
    if (!available) return;
    BudgetNative.getAppSettings()
      .then(setSettings)
      .catch((error) => console.warn('Native settings unavailable', error));
    BudgetNative.getProvisioningInfo()
      .then((info) => setExpiryTest(info.isOverride))
      .catch(() => undefined);
  }, [available]);

  /** Debug: pretend the signing profile expires in 2 days so the banner can be checked. */
  const setExpiryTestEnabled = useCallback(async (enabled: boolean) => {
    const info = await BudgetNative.setDebugExpiryOverride(enabled ? { days: 2 } : {});
    setExpiryTest(info.isOverride);
    window.dispatchEvent(new Event(PROVISIONING_CHANGED_EVENT));
  }, []);

  const update = useCallback(
    async (change: Parameters<typeof BudgetNative.setAppSettings>[0]) => {
      setBusy(true);
      try {
        setSettings(await BudgetNative.setAppSettings(change));
      } catch (error) {
        if (!isNativeCancel(error)) {
          toast({ title: t('profile.appSettingFailed'), variant: 'destructive' });
        }
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const setNotification = useCallback(
    async (kind: NotificationKind, enabled: boolean) => {
      if (enabled && !(await ensureNotificationPermission())) {
        toast({ title: t('profile.notificationsDenied'), variant: 'destructive' });
        return;
      }
      setNotificationPref(kind, enabled);
      setPrefs(getNotificationPrefs());
    },
    [t],
  );

  const sendTest = useCallback(async () => {
    const sent = await sendTestNotification(t);
    toast({
      title: sent ? t('profile.testNotificationSent') : t('profile.notificationsDenied'),
      variant: sent ? 'default' : 'destructive',
    });
  }, [t]);

  return { available, settings, prefs, busy, update, setNotification, sendTest, expiryTest, setExpiryTestEnabled };
}
