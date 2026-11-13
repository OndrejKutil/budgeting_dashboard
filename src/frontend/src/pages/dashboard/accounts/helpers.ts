import type { Account } from '@/lib/api/types';
import type { DashboardTranslationKey } from '@/lib/i18n';

export type NetWorthRange = '30d' | '90d' | '1y' | 'all';
export const NET_WORTH_RANGES: NetWorthRange[] = ['30d', '90d', '1y', 'all'];

export function getDateRange(range: NetWorthRange): { start: string | undefined; end: string } {
  const end = new Date();
  const endStr = end.toISOString().split('T')[0];
  if (range === 'all') return { start: undefined, end: endStr };
  const start = new Date();
  if (range === '30d') start.setDate(start.getDate() - 29);
  else if (range === '90d') start.setDate(start.getDate() - 89);
  else start.setFullYear(start.getFullYear() - 1);
  return { start: start.toISOString().split('T')[0], end: endStr };
}

export const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** A month flow that displays as 0.00 is "no change". */
export const isZeroAmount = (value: number) => Math.abs(value) < 0.005;

/**
 * Sum of one base-currency field over some accounts. Accounts without a usable value are
 * left out rather than counted as 0 or mixed in from another currency; null when none count,
 * so the caller can show a dash instead of a misleading 0.
 */
export function sumBase(accounts: Account[], pick: (account: Account) => number | null | undefined): number | null {
  let total = 0;
  let counted = 0;
  for (const account of accounts) {
    const value = pick(account);
    if (isFiniteNumber(value)) {
      total += value;
      counted += 1;
    }
  }
  return counted > 0 ? total : null;
}

/** Main currency before foreign, then by currency code and name (same order as the account pickers). */
export function sortAccounts(accounts: Account[], baseCurrency: string): Account[] {
  const code = (account: Account) => account.currency || baseCurrency;
  const foreign = (account: Account) => Number(code(account) !== baseCurrency);
  return accounts
    .slice()
    .sort(
      (a, b) =>
        foreign(a) - foreign(b) ||
        code(a).localeCompare(code(b)) ||
        a.account_name.localeCompare(b.account_name),
    );
}

type PluralPrefix = 'pages.accounts.active' | 'pages.accounts.groupCaption';

/** Which "...One / ...Few / ...Many" string fits this count in this locale. */
export function pluralKey(locale: string, count: number, prefix: PluralPrefix): DashboardTranslationKey {
  const category = new Intl.PluralRules(locale).select(count);
  const suffix = category === 'one' ? 'One' : category === 'few' ? 'Few' : 'Many';
  return `${prefix}${suffix}` as DashboardTranslationKey;
}
