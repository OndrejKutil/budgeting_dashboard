import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUser } from '@/contexts/user-context';
import type { Account } from '@/lib/api/types';
import { formatMoney } from '@/lib/currency';
import { isOptimistic } from '@/lib/optimistic';
import { cn } from '@/lib/utils';
import { FlowText } from './FlowText';
import { isFiniteNumber } from './helpers';
import { MoneyFigure } from './MoneyFigure';
import { Trace } from './Trace';

interface AccountRowProps {
  account: Account;
  typeLabel: string;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onActivate: (accountId: string) => void;
}

/**
 * One account: name with type beneath, a 30-day trace, this month's flow and the balance as
 * the largest thing on the row. Below the desktop breakpoint the trace and flow drop to a
 * second line under name and balance.
 */
export function AccountRow({ account, typeLabel, onEdit, onDelete, onActivate }: AccountRowProps) {
  const { t, currency: baseCurrency } = useUser();
  const currency = account.currency || 'CZK';
  const inactive = account.account_is_active === false;
  // Optimistic rows hold a temporary id: acting on one would send a request for an account
  // that does not exist yet, so the menu stays disabled until the server row lands.
  const pending = isOptimistic(account);
  const foreign = currency !== baseCurrency;
  const baseBalance = account.current_balance_base;
  const history = (account.history_30d ?? []).map((point) => point.balance);

  return (
    <li
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 border-b border-border py-4',
        'lg:grid-cols-[minmax(8rem,1fr)_minmax(0,6.25rem)_minmax(min-content,13.125rem)_minmax(min-content,14.375rem)_2rem] lg:gap-x-6 lg:pl-[1.375rem]',
        (inactive || pending) && 'opacity-60',
      )}
    >
      <div className="order-1 min-w-0">
        <div className="truncate text-[0.9375rem]">{account.account_name}</div>
        <div className="truncate text-[0.8125rem] text-muted-foreground">
          {typeLabel}
          {inactive && ` · ${t('states.inactive')}`}
          {isFiniteNumber(baseBalance) ? (
            foreign && (
              <>
                {' · '}
                <SensitiveValue>{formatMoney(baseBalance, baseCurrency)}</SensitiveValue>
              </>
            )
          ) : (
            <span title={t('pages.accounts.excludedHint')}> · {t('pages.accounts.excludedHint')}</span>
          )}
        </div>
      </div>

      <MoneyFigure
        amount={account.current_balance || 0}
        currency={currency}
        className="order-2 text-right min-w-0 text-[1.5rem] font-normal tracking-[-0.03em] sm:text-[1.75rem] lg:order-4 lg:leading-none"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={`${t('common.actions')}: ${account.account_name}`}
            className="order-3 -mr-2 h-8 w-8 text-muted-foreground lg:order-5 lg:mr-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(account)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </DropdownMenuItem>
          {inactive && (
            <DropdownMenuItem onClick={() => onActivate(account.accounts_id_pk)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.activate')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(account.accounts_id_pk)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="order-4 col-span-3 flex items-center justify-between gap-4 lg:contents">
        <Trace values={history} className="lg:order-2 lg:justify-self-end" />
        <FlowText
          value={account.net_flow_mtd || 0}
          currency={currency}
          className="whitespace-nowrap text-[0.84375rem] lg:order-3 lg:text-right"
        />
      </div>
    </li>
  );
}
