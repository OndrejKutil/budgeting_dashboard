/**
 * Account grouping shared by every account picker in the app.
 *
 * Lives outside the picker components so the single-select form control and the
 * multi-select filter can never present the same accounts in two different orders.
 */

import { useQuery } from '@tanstack/react-query';

import { useUser } from '@/contexts/user-context';
import { accountGroupsApi } from '@/lib/api/endpoints';
import type { Account } from '@/lib/api/types';
import { getCurrencyFlag } from '@/lib/currency';

export interface AccountSection {
  key: string;
  label: string;
  items: Account[];
}

interface SectionOptions {
  /** Accounts to leave out — the transfer source must not also be the destination. */
  excludeIds?: string[];
  /**
   * Show deactivated accounts in a trailing section. Right for filters (their old
   * transactions are still in the ledger); wrong for forms, which must not book new
   * money into a closed account.
   */
  includeInactive?: boolean;
  /**
   * Already-chosen accounts, kept visible even when deactivated. Editing an old
   * transaction can point at an account that has since been closed, and dropping it
   * would silently blank the field on open.
   */
  keepIds?: string[];
}

/**
 * Group accounts the way the Accounts page does: each account group under its own name,
 * then the main currency, then foreign, then whatever inactive accounts have to stay
 * visible. Shared so the single-select form picker and the multi-select filter can never
 * present the same accounts in two different orders.
 *
 * Returns only non-empty sections, so a caller with one section can skip headers entirely.
 */
export function useAccountSections(
  accounts: Account[],
  { excludeIds, includeInactive, keepIds }: SectionOptions = {},
): AccountSection[] {
  const { t, currency: userCurrency } = useUser();

  // Shared cache key with AccountsPage, so this costs nothing beyond the first fetch.
  const { data: groups = [] } = useQuery({
    queryKey: ['account-groups'],
    queryFn: async () => (await accountGroupsApi.getAll()).data || [],
  });

  const isForeign = (a: Account) => !!a.currency && a.currency !== userCurrency;

  // Main currency before foreign inside a multicurrency group, then alphabetical.
  const byCurrencyThenName = (a: Account, b: Account) =>
    Number(isForeign(a)) - Number(isForeign(b)) ||
    (a.currency || userCurrency).localeCompare(b.currency || userCurrency) ||
    a.account_name.localeCompare(b.account_name);

  const excluded = new Set(excludeIds ?? []);
  const kept = new Set(keepIds ?? []);
  const selectable = accounts.filter(a => !excluded.has(a.accounts_id_pk));
  const active = selectable.filter(a => a.account_is_active !== false);
  const ungrouped = active.filter(a => !a.account_group_id_fk);

  const inactive = selectable.filter(
    a => a.account_is_active === false && (includeInactive || kept.has(a.accounts_id_pk)),
  );

  return [
    ...groups
      .slice()
      .sort((a, b) => a.group_name.localeCompare(b.group_name))
      .map(group => ({
        key: group.account_groups_id_pk,
        label: group.group_name,
        items: active.filter(a => a.account_group_id_fk === group.account_groups_id_pk),
      })),
    { key: 'native', label: userCurrency, items: ungrouped.filter(a => !isForeign(a)) },
    {
      key: 'foreign',
      label: t('pages.accounts.foreignCurrencies'),
      items: ungrouped.filter(isForeign),
    },
    {
      key: 'inactive',
      label: t('pages.accounts.inactiveAccounts'),
      items: inactive,
    },
  ]
    .filter(s => s.items.length > 0)
    .map(s => ({ ...s, items: s.items.slice().sort(byCurrencyThenName) }));
}

/** Flag + name, the way an account reads everywhere in the app. */
export function accountLabel(account: Account): string {
  return `${getCurrencyFlag(account.currency)} ${account.account_name}`;
}
