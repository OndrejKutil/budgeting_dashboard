/** Whole-day difference between `dateStr` (YYYY-MM-DD) and today, normalized to local midnight. */
export function daysDiff(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * Formats a Date using its LOCAL calendar fields (YYYY-MM-DD).
 *
 * `date.toISOString().split('T')[0]` converts to UTC first, which silently shifts the date
 * back a day for any timezone ahead of UTC (e.g. Central Europe) when `date` holds local
 * midnight, as picker components typically produce. Use this instead whenever a locally
 * selected calendar date needs to become a plain date string.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
