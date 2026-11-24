/**
 * Data the native features need (widgets, notifications), loaded once per sync.
 * Native iOS app only; see NativeSync.
 */
import { accountGroupsApi, accountsApi, categoriesApi, recurringApi, summaryApi, transactionsApi } from '@/lib/api/endpoints';
import type { Account, Recurring, SummaryData } from '@/lib/api/types';

export interface UpcomingPayment {
  name: string;
  amount: number;
  /** Currency of the payment's account. */
  currency: string;
  /** `YYYY-MM-DD`. */
  date: string;
  autoPost: boolean;
}

/** One row of the Balances widget: an account group (in the base currency) or an ungrouped account. */
export interface BalanceRow {
  name: string;
  /** e.g. "3 accounts" or "EUR · no group" (already translated). */
  detail: string;
  amount: number;
  currency: string;
  /** Change over the last 30 days; null without history. */
  change30d: number | null;
  /** Daily balances over the last 30 days, oldest first. */
  history: number[];
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
  /** Recurring income still due this month (base-currency payments only). */
  expectedIncome: number;
  /** Account groups and ungrouped accounts, largest first. */
  balances: BalanceRow[];
}

export interface NativeLabels {
  fallbackName: string;
  /** "{count} accounts" */
  accounts: (count: number) => string;
  /** "{currency} · no group" */
  noGroup: (currency: string) => string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Recurring income (positive amounts) in the base currency still due between today and month end. */
function expectedIncome(recurring: Recurring[], currencyByAccount: Map<string, string | null>, currency: string, now: Date): number {
  const today = isoDay(now);
  const monthEnd = isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  let total = 0;
  for (const r of recurring) {
    if (r.is_active === false || r.amount <= 0 || (currencyByAccount.get(r.account_id_fk) || currency) !== currency) continue;
    const step = r.cadence === 'weekly' ? 7 : r.cadence === 'biweekly' ? 14 : 0;
    const [y, m, d] = r.next_date.slice(0, 10).split('-').map(Number);
    let date = new Date(y, m - 1, d);
    while (isoDay(date) <= monthEnd) {
      if (isoDay(date) >= today) total += r.amount;
      if (!step) break;
      date = new Date(date.getTime() + step * DAY_MS);
    }
  }
  return total;
}

/** Same grouping as the Accounts page: groups summed in the base currency, ungrouped accounts on their own. */
function balanceRows(accounts: Account[], groups: { account_groups_id_pk: string; group_name: string }[], currency: string, labels: NativeLabels): BalanceRow[] {
  const active = accounts.filter((a) => a.account_is_active !== false);
  const baseFactor = (a: Account) =>
    a.current_balance && a.current_balance_base != null ? a.current_balance_base / a.current_balance : (a.currency || currency) === currency ? 1 : 0;
  const historyOf = (members: Account[], inBase: boolean): number[] => {
    const byDate = new Map<string, number>();
    for (const a of members) {
      const factor = inBase ? baseFactor(a) : 1;
      for (const point of a.history_30d ?? []) byDate.set(point.date, (byDate.get(point.date) ?? 0) + point.balance * factor);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  };
  const row = (name: string, detail: string, amount: number, rowCurrency: string, history: number[]): BalanceRow => ({
    name,
    detail,
    amount,
    currency: rowCurrency,
    change30d: history.length > 1 ? amount - history[0] : null,
    history,
  });

  const groupIds = new Set(groups.map((g) => g.account_groups_id_pk));
  const rows: { row: BalanceRow; base: number }[] = [];
  for (const group of groups) {
    const members = active.filter((a) => a.account_group_id_fk === group.account_groups_id_pk);
    if (members.length === 0) continue;
    const amount = members.reduce((sum, a) => sum + (a.current_balance_base ?? a.current_balance ?? 0), 0);
    rows.push({ row: row(group.group_name, labels.accounts(members.length), amount, currency, historyOf(members, true)), base: amount });
  }
  for (const a of active.filter((a) => !a.account_group_id_fk || !groupIds.has(a.account_group_id_fk))) {
    const accountCurrency = a.currency || currency;
    rows.push({
      row: row(a.account_name, labels.noGroup(accountCurrency), a.current_balance ?? 0, accountCurrency, historyOf([a], false)),
      base: a.current_balance_base ?? a.current_balance ?? 0,
    });
  }
  return rows.sort((a, b) => b.base - a.base).slice(0, 6).map(({ row }) => row);
}

const pad = (value: number) => String(value).padStart(2, '0');
export const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export async function loadNativeData(currency: string, labels: NativeLabels): Promise<NativeData> {
  const now = new Date();
  const today = isoDay(now);
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const monthEnd = isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [recurring, accounts, categories, summary, todays, groups] = await Promise.all([
    recurringApi.getAll(),
    accountsApi.getAll({ base_currency: currency }),
    categoriesApi.getAll(),
    summaryApi.get({ start_date: monthStart, end_date: monthEnd, base_currency: currency }).catch(() => null),
    transactionsApi.getAll({ start_date: today, end_date: today, limit: 1 }).catch(() => null),
    accountGroupsApi.getAll().catch(() => null),
  ]);

  const currencyByAccount = new Map(accounts.data.map((a) => [a.accounts_id_pk, a.currency]));
  const categoryName = new Map(categories.data.map((c) => [c.categories_id_pk, c.category_name]));

  const upcoming = recurring.data
    .filter((r: Recurring) => r.is_active !== false && r.next_date.slice(0, 10) >= today)
    .sort((a, b) => a.next_date.localeCompare(b.next_date))
    .map((r) => ({
      name: r.notes || categoryName.get(r.category_id_fk) || labels.fallbackName,
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
    expectedIncome: expectedIncome(recurring.data, currencyByAccount, currency, now),
    balances: balanceRows(accounts.data, groups?.data ?? [], currency, labels),
  };
}
