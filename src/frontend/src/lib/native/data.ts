/**
 * Data the native features need (widgets, notifications), loaded once per sync.
 * Native iOS app only; see NativeSync.
 */
import { accountsApi, categoriesApi, recurringApi, summaryApi, transactionsApi } from '@/lib/api/endpoints';
import type { Recurring, SummaryData } from '@/lib/api/types';

export interface UpcomingPayment {
  name: string;
  amount: number;
  /** Currency of the payment's account. */
  currency: string;
  /** `YYYY-MM-DD`. */
  date: string;
  autoPost: boolean;
}

export interface NativeData {
  /** Active recurring payments with a next date today or later, soonest first. */
  upcoming: UpcomingPayment[];
  /** This month's figures (null if the request failed). */
  summary: SummaryData | null;
  /** Whether any transaction is dated today (the daily reminder is skipped then). */
  loggedToday: boolean;
  /** Base currency the summary is in. */
  currency: string;
}

const pad = (value: number) => String(value).padStart(2, '0');
export const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export async function loadNativeData(currency: string, fallbackName: string): Promise<NativeData> {
  const now = new Date();
  const today = isoDay(now);
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const monthEnd = isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [recurring, accounts, categories, summary, todays] = await Promise.all([
    recurringApi.getAll(),
    accountsApi.getAll(),
    categoriesApi.getAll(),
    summaryApi.get({ start_date: monthStart, end_date: monthEnd, base_currency: currency }).catch(() => null),
    transactionsApi.getAll({ start_date: today, end_date: today, limit: 1 }).catch(() => null),
  ]);

  const currencyByAccount = new Map(accounts.data.map((a) => [a.accounts_id_pk, a.currency]));
  const categoryName = new Map(categories.data.map((c) => [c.categories_id_pk, c.category_name]));

  const upcoming = recurring.data
    .filter((r: Recurring) => r.is_active !== false && r.next_date.slice(0, 10) >= today)
    .sort((a, b) => a.next_date.localeCompare(b.next_date))
    .map((r) => ({
      name: r.notes || categoryName.get(r.category_id_fk) || fallbackName,
      amount: r.amount,
      currency: currencyByAccount.get(r.account_id_fk) || currency,
      date: r.next_date.slice(0, 10),
      autoPost: r.auto_post,
    }));

  return {
    upcoming,
    summary: summary?.success && summary.data ? summary.data : null,
    loggedToday: (todays?.data?.length ?? 0) > 0,
    currency,
  };
}
