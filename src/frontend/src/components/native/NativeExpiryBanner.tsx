import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { BudgetNative, PROVISIONING_CHANGED_EVENT, isNativeApp } from '@/lib/native/budgetNative';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Warn when the signing profile has less than this left (free Apple ID profiles last 7 days). */
const WARN_BELOW_MS = 3 * DAY_MS;
const DISMISSED_KEY = 'budget-dashboard:expiry-banner-dismissed';

/**
 * Native iOS app only: warns when the app's signing profile is about to expire, because an
 * expired sideloaded app stops opening until SideStore refreshes it. Nothing in browsers or the PWA.
 */
export function NativeExpiryBanner() {
  const { t } = useUser();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === 'true');

  useEffect(() => {
    if (!isNativeApp()) return;
    const load = () => {
      BudgetNative.getProvisioningInfo()
        .then((info) => setExpiresAt(info.expiresAt ? new Date(info.expiresAt) : null))
        .catch(() => setExpiresAt(null));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onChanged = () => {
      sessionStorage.removeItem(DISMISSED_KEY);
      setDismissed(false);
      load();
    };
    load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(PROVISIONING_CHANGED_EVENT, onChanged);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(PROVISIONING_CHANGED_EVENT, onChanged);
    };
  }, []);

  if (!expiresAt || dismissed) return null;
  const remaining = expiresAt.getTime() - Date.now();
  if (remaining >= WARN_BELOW_MS) return null;

  const days = Math.floor(remaining / DAY_MS);
  const when = days <= 0 ? t('profile.expiryToday') : days === 1 ? t('profile.expiryTomorrow') : t('profile.expiryInDays', { count: days });

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-foreground"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="flex-1">{t('profile.expiryBanner', { when })}</p>
      <button
        type="button"
        aria-label={t('profile.expiryDismiss')}
        className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          sessionStorage.setItem(DISMISSED_KEY, 'true');
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
