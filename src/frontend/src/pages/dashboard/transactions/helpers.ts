import type { DashboardTranslationKey } from '@/lib/i18n';

export const ITEMS_PER_PAGE: number = 20;
export const DECIMAL_INPUT_PATTERN = "-?[0-9]*([.,][0-9]*)?";

// Categories are grouped by type in both the form picker and the filter, so the ordering
// lives here rather than inside either one's JSX.
export const CATEGORY_TYPE_ORDER = ['expense', 'income', 'saving', 'investment', 'exclude', 'transfer'] as const;
export const CATEGORY_TYPE_LABEL_KEY: Record<string, DashboardTranslationKey> = {
  expense: 'metrics.expenses', income: 'metrics.income', saving: 'types.saving',
  investment: 'metrics.investments', exclude: 'types.exclude', transfer: 'types.transfer',
};

/** Colour per category type: the row's side line and the category dot. */
export function typeColor(type: string): string {
  switch (type) {
    case 'income': return 'hsl(var(--success))';
    case 'saving': return 'hsl(var(--chart-savings))';
    case 'investment': return 'hsl(var(--chart-investment))';
    default: return 'hsl(var(--destructive))';
  }
}

/**
 * Filters persist to the URL and session storage as a single string, so a multi-select
 * stores its picks comma-joined. 'all' is the legacy sentinel for "no filter" and stays —
 * it keeps old bookmarked URLs working and reads better in the bar than an empty param.
 */
export function parseFilter(value: string): string[] {
  return !value || value === 'all' ? [] : value.split(',');
}

export function serializeFilter(values: string[]): string {
  return values.length ? values.join(',') : 'all';
}

/** `YYYY-MM` — how a picked month is stored, sent, and compared. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** `monthsAgo(0)` is this month; the Date constructor rolls negative months into last year. */
export function monthsAgo(count: number): string {
  const now = new Date();
  return monthKey(new Date(now.getFullYear(), now.getMonth() - count, 1));
}

/**
 * Read the month filter, upgrading the format it used to have.
 *
 * Months were once bare numbers scoped to the Year select; they now carry their year so a
 * selection can span one (Nov + Dec + Jan). Saved sessions and shared links still hold the
 * old shape, and an unqualified "3" would reach the backend as a malformed month — so
 * anything without a year gets the selected one.
 */
export function parseMonths(value: string, fallbackYear: string): string[] {
  return parseFilter(value).map(month =>
    month.includes('-') ? month : `${fallbackYear}-${month.padStart(2, '0')}`,
  );
}

/**
 * A transfer writes two ledger rows. When the second create fails the first is already posted,
 * so the error message has to say that rather than implying nothing happened. Declared at module
 * scope so `instanceof` stays valid across re-renders.
 */
export class PartialTransferError extends Error {}

export function isNegativeAmountInput(value: string): boolean {
  return value.trim().startsWith('-');
}

export function toggleAmountSign(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) return '-';
  if (trimmedValue.startsWith('-')) return trimmedValue.slice(1);

  return `-${trimmedValue}`;
}

/**
 * An FX rate and its reciprocal live on wildly different scales — 25.1234 CZK/EUR against
 * 0.0398 EUR/CZK — so a fixed decimal count either wastes digits on one side or throws
 * away precision on the other. Anchor on significant digits below 1 instead.
 */
export function formatRate(rate: number): string {
  return rate >= 1 ? rate.toFixed(4) : rate.toPrecision(4);
}

export function parseDecimalInput(value: string): number | null {
  const compactValue = value.trim().replace(/\s/g, '');
  if (!compactValue) return null;

  const lastComma = compactValue.lastIndexOf(',');
  const lastDot = compactValue.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : lastDot >= 0 ? '.' : '';

  let normalizedValue = compactValue;
  if (decimalSeparator) {
    const decimalIndex = decimalSeparator === ',' ? lastComma : lastDot;
    const integerPart = compactValue.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimalPart = compactValue.slice(decimalIndex + 1).replace(/[.,]/g, '');
    normalizedValue = `${integerPart}.${decimalPart}`;
  }

  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalizedValue)) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/**
 * Which "{count} transactions" string fits this count in this locale. Intl.PluralRules knows
 * the Czech split (1 / 2-4 / 5+ and 0), so no per-locale logic lives here.
 */
export function transactionCountKey(locale: string, count: number): DashboardTranslationKey {
  const category = new Intl.PluralRules(locale).select(count);
  if (category === 'one') return 'pages.transactions.countOne';
  if (category === 'few') return 'pages.transactions.countFew';
  return 'pages.transactions.countMany';
}

/** Narrow symbol of a currency code ("Kč", "€"), falling back to the code itself. */
export function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find(p => p.type === 'currency');
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

export type TransactionField = 'amount' | 'category' | 'account' | 'toAccount' | 'destAmount' | 'fund';
export type TransactionMode = 'standard' | 'transfer' | 'withdrawal';

export interface TransactionFormData {
  amount: string;
  date: string;
  notes: string;
  category_id_fk: string;
  account_id_fk: string;
  savings_fund_id_fk: string;
  tags: number[];
}
