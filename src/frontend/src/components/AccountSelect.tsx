/**
 * The one account picker used by every form and filter in the app.
 *
 * A flat alphabetical list stops being useful the moment you hold the same bank in two
 * currencies: "Revolut CZK" and "Revolut EUR" sort next to each other by luck, while
 * "IBKR USD" lands between two CZK accounts it has nothing to do with. The Accounts page
 * already solved this — groups first, then your main currency, then the foreign ones — so
 * this mirrors that shape instead of inventing a second mental model for the dropdown.
 *
 * Each row also carries its balance, because the question behind picking an account is
 * usually "which one has the money / which one did this come out of".
 *
 * Headers only appear when they earn their keep: with no groups and no foreign accounts
 * the list renders flat, exactly as it did before.
 */

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check } from 'lucide-react';

import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/contexts/user-context';
import { accountLabel, useAccountSections } from '@/hooks/use-account-sections';
import type { Account } from '@/lib/api/types';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';

const SECTION_LABEL =
  'px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50';

/**
 * Rows here are built from the Radix primitive rather than the shared SelectItem, which
 * reserves `pl-8` on the left for its tick. That indent would push every account name off
 * the line its own section header sits on, and with a balance riding the right edge there
 * is a free slot there anyway — so the tick moves right and names stay flush left. The
 * `pr-8` that buys is what keeps the balance clear of the tick on the selected row.
 */
const ROW =
  'relative flex w-full cursor-default select-none items-center justify-between gap-4 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

function Tick() {
  return (
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  );
}

/** The muted balance that trails an account in a picker, blurred under privacy mode. */
export function AccountBalance({ account }: { account: Account }) {
  const { currency: userCurrency } = useUser();
  if (account.current_balance === null || account.current_balance === undefined) return null;
  return (
    <SensitiveValue className="shrink-0 text-xs text-muted-foreground">
      {formatMoney(account.current_balance, account.currency || userCurrency)}
    </SensitiveValue>
  );
}

interface AccountSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  accounts: Account[];
  placeholder: string;
  /** Extra entry pinned above every section, e.g. "All accounts" on a filter bar. */
  allOption?: { value: string; label: string };
  excludeIds?: string[];
  includeInactive?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function AccountSelect({
  value,
  onValueChange,
  accounts,
  placeholder,
  allOption,
  excludeIds,
  includeInactive,
  id,
  className,
  disabled,
}: AccountSelectProps) {
  const sections = useAccountSections(accounts, {
    excludeIds,
    includeInactive,
    keepIds: value ? [value] : [],
  });

  // With everything in one bucket the headers are noise — render the plain list instead.
  const showLabels = sections.length > 1;

  const selected = accounts.find(a => a.accounts_id_pk === value);
  const triggerLabel =
    allOption && value === allOption.value
      ? allOption.label
      : selected
        ? accountLabel(selected)
        : null;

  // No currency code next to the balance — the flag already says which currency it is.
  const renderItem = (acc: Account) => (
    <SelectPrimitive.Item
      key={acc.accounts_id_pk}
      value={acc.accounts_id_pk}
      // Without this Radix types ahead on the flag emoji instead of the account name.
      textValue={acc.account_name}
      className={ROW}
    >
      {/* min-w-0 so a long name truncates instead of shoving the balance off the row. */}
      <SelectPrimitive.ItemText className="min-w-0 truncate">
        {accountLabel(acc)}
      </SelectPrimitive.ItemText>
      <AccountBalance account={acc} />
      <Tick />
    </SelectPrimitive.Item>
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder}>{triggerLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allOption && (
          <SelectPrimitive.Item value={allOption.value} className={ROW}>
            <SelectPrimitive.ItemText>{allOption.label}</SelectPrimitive.ItemText>
            <Tick />
          </SelectPrimitive.Item>
        )}
        {sections.map((section, i) =>
          showLabels ? (
            <SelectGroup key={section.key}>
              <SelectLabel
                className={cn(
                  SECTION_LABEL,
                  (i > 0 || allOption) && 'mt-1 border-t border-border/40 pt-2',
                )}
              >
                {section.label}
              </SelectLabel>
              {section.items.map(renderItem)}
            </SelectGroup>
          ) : (
            section.items.map(renderItem)
          ),
        )}
      </SelectContent>
    </Select>
  );
}
