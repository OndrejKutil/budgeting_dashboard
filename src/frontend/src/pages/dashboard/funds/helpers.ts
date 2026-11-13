import type { DashboardTranslationKey } from '@/lib/i18n';
import type { SavingsFund } from '@/lib/api/types';

export type FundSortKey = 'created' | 'name' | 'progress' | 'target' | 'activity';

export const FUND_SORT_STORAGE_KEY = 'funds-sort';
export const FUND_SORT_KEYS: readonly FundSortKey[] = ['created', 'name', 'progress', 'target', 'activity'];

export const FUND_SORT_LABELS: Record<FundSortKey, DashboardTranslationKey> = {
  created: 'pages.funds.sortCreated',
  name: 'pages.funds.sortName',
  progress: 'pages.funds.sortProgress',
  target: 'pages.funds.sortTarget',
  activity: 'pages.funds.sortActivity',
};

/** The remembered sort, ignoring anything this version does not know. */
export function readStoredSort(): FundSortKey {
  const stored = localStorage.getItem(FUND_SORT_STORAGE_KEY);
  return FUND_SORT_KEYS.find((key) => key === stored) ?? 'created';
}

/** Amounts that display as 0 when shown whole are 0: no "-0", no coloured zero. */
export const isZero = (value: number) => Math.abs(value) < 0.5;

export const savedOf = (fund: SavingsFund) => fund.current_amount || 0;
export const hasTarget = (fund: SavingsFund) => fund.target_amount > 0;
/** Saved as a share of the target, in percent (can exceed 100 or be negative). 0 without a target. */
export const progressOf = (fund: SavingsFund) => (hasTarget(fund) ? (savedOf(fund) / fund.target_amount) * 100 : 0);
/** Net money in/out over the last 30 days; anything that displays as 0 is 0. */
export const flowOf = (fund: SavingsFund) => {
  const flow = fund.net_flow_30d ?? 0;
  return isZero(flow) ? 0 : flow;
};

export function sortFunds(funds: SavingsFund[], sort: FundSortKey): SavingsFund[] {
  return [...funds].sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.fund_name.localeCompare(b.fund_name);
      case 'progress':
        return progressOf(b) - progressOf(a);
      case 'target':
        return b.target_amount - a.target_amount;
      case 'activity':
        return Math.abs(b.net_flow_30d || 0) - Math.abs(a.net_flow_30d || 0);
      case 'created':
      default:
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    }
  });
}

/** Which "the N targets add up to" string fits this count in this locale (Czech has three forms). */
export function targetsKey(locale: string, count: number): DashboardTranslationKey {
  const category = new Intl.PluralRules(locale).select(count);
  if (category === 'one') return 'pages.funds.leadTargetsOne';
  if (category === 'few') return 'pages.funds.leadTargetsFew';
  return 'pages.funds.leadTargetsMany';
}
