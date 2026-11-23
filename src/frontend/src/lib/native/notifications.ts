/**
 * Local notifications for the native iOS app (no server push on a free Apple account).
 *
 * Everything is rescheduled from scratch on each sync (see NativeSync): when the app opens or
 * returns to the foreground, on login, after transactions change and when a setting changes.
 * Only used inside the native app.
 *
 * - Daily reminder at 20:00 to log the day's spending, for the next 7 days. Today's is skipped
 *   once a transaction dated today exists ("smart" reminder), so it only nags when needed.
 * - "Due today" at 07:00 on the next due date of each active recurring payment. The Raspberry Pi
 *   auto-posts at 05:00, so the text says "auto-post" rather than "posted" in case it didn't run.
 */
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { formatMoney } from '@/lib/currency';
import type { DashboardTranslationKey } from '@/lib/i18n';
import type { NativeData } from '@/lib/native/data';

type Translate = (key: DashboardTranslationKey, params?: Record<string, string | number>) => string;

export type NotificationPrefs = { daily: boolean; recurring: boolean };
export type NotificationKind = keyof NotificationPrefs;

const PREF_KEYS: Record<NotificationKind, string> = {
  daily: 'budget-dashboard:notify-daily',
  recurring: 'budget-dashboard:notify-recurring',
};

/** Dispatched on window when a preference changes, so the scheduler re-syncs. */
export const NOTIFICATION_PREFS_EVENT = 'budget:notification-prefs-changed';

const DAILY_ID_BASE = 1;
const DAILY_DAYS = 7;
const DAILY_REMINDER_HOUR = 20;
const DUE_ID_BASE = 100;
const TEST_ID = 9999;
const DUE_REMINDER_HOUR = 7;
/** iOS keeps at most 64 pending notifications per app (7 daily + these + the test one). */
const MAX_DUE = 45;

export function getNotificationPrefs(): NotificationPrefs {
  // On unless switched off.
  return {
    daily: localStorage.getItem(PREF_KEYS.daily) !== 'false',
    recurring: localStorage.getItem(PREF_KEYS.recurring) !== 'false',
  };
}

export function setNotificationPref(kind: NotificationKind, enabled: boolean): void {
  localStorage.setItem(PREF_KEYS[kind], String(enabled));
  window.dispatchEvent(new Event(NOTIFICATION_PREFS_EVENT));
}

/** Asks iOS for permission the first time; returns whether notifications may be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
  let status = await LocalNotifications.checkPermissions();
  if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
    status = await LocalNotifications.requestPermissions();
  }
  return status.display === 'granted';
}

export async function cancelScheduledNotifications(): Promise<void> {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
}

export async function syncNotifications(t: Translate, privacyMode: boolean, data: NativeData): Promise<void> {
  const prefs = getNotificationPrefs();
  await cancelScheduledNotifications();
  if (!prefs.daily && !prefs.recurring) return;
  if (!(await ensureNotificationPermission())) return;

  const now = new Date();
  const notifications: LocalNotificationSchema[] = [];
  if (prefs.daily) {
    for (let day = 0; day < DAILY_DAYS; day += 1) {
      if (day === 0 && data.loggedToday) continue;
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, DAILY_REMINDER_HOUR, 0, 0);
      if (at <= now) continue;
      notifications.push({
        id: DAILY_ID_BASE + day,
        title: t('profile.notifyDailyTitle'),
        body: t('profile.notifyDailyBody'),
        schedule: { at, allowWhileIdle: true },
      });
    }
  }
  if (prefs.recurring) {
    notifications.push(...dueTodayNotifications(t, privacyMode, data, now));
  }
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

function dueTodayNotifications(t: Translate, privacyMode: boolean, data: NativeData, now: Date): LocalNotificationSchema[] {
  return data.upcoming
    .map((payment) => ({ payment, at: dueReminderTime(payment.date) }))
    .filter((item): item is { payment: (typeof data.upcoming)[number]; at: Date } => item.at !== null && item.at > now)
    .slice(0, MAX_DUE)
    .map(({ payment, at }, index) => {
      const action = payment.autoPost ? t('profile.notifyDueAuto') : t('profile.notifyDueManual');
      const body = privacyMode ? action : `${formatMoney(payment.amount, payment.currency)} · ${action}`;
      return {
        id: DUE_ID_BASE + index,
        title: t('profile.notifyDueTitle', { name: payment.name }),
        body,
        schedule: { at, allowWhileIdle: true },
      };
    });
}

/** 07:00 local time on a `YYYY-MM-DD` date, or null if it can't be parsed. */
function dueReminderTime(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), DUE_REMINDER_HOUR, 0, 0);
}

/** Fires a test notification after 5 seconds (enough time to leave the app or lock the phone). */
export async function sendTestNotification(t: Translate): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  await LocalNotifications.schedule({
    notifications: [{
      id: TEST_ID,
      title: t('profile.notifyTestTitle'),
      body: t('profile.notifyTestBody'),
      schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
    }],
  });
  return true;
}
