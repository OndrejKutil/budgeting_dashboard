/**
 * Currency formatting utility.
 *
 * Each currency is formatted with its canonical locale so the number style
 * looks natural (e.g. EUR always uses German grouping/decimal conventions,
 * CZK uses Czech, USD uses US English) regardless of the user's app locale.
 *
 * Used for:
 *  - Account card balances  → formatMoney(amount, account.currency)
 *  - Transaction row amounts → formatMoney(amount, account.currency)
 *  - Dashboard totals       → formatMoney(amount, userCurrency)  (via UserContext.formatCurrency wrapper)
 */

// Currencies the app supports account-wide (see the currency Select in AccountsPage.tsx).
// CURRENCY_FLAG/CURRENCY_LOCALE below should stay in sync with this set.
export const SUPPORTED_CURRENCIES = ['AUD', 'CAD', 'CZK', 'EUR', 'GBP', 'PLN', 'USD'] as const;

const CURRENCY_FLAG: Record<string, string> = {
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CZK: '🇨🇿',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  PLN: '🇵🇱',
  USD: '🇺🇸',
};

export function getCurrencyFlag(currency?: string | null): string {
  return currency ? (CURRENCY_FLAG[currency] ?? currency) : '';
}

const CURRENCY_LOCALE: Record<string, string> = {
  AUD: 'en-AU',
  CAD: 'en-CA',
  CZK: 'cs-CZ',
  EUR: 'de-DE',
  GBP: 'en-GB',
  PLN: 'pl-PL',
  USD: 'en-US',
};

/**
 * Short form for chart axis ticks: "12,5 tis. Kč" instead of "12 500,00 Kč".
 *
 * A tick only has to say roughly where you are on the scale, and full-precision
 * amounts either overlap each other or force the plot to give up its width. Exact
 * figures stay in tooltips, tables and KPIs.
 */
export function formatMoneyCompact(amount: number, currency: string): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatMoney(amount: number, currency: string): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
