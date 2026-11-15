import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
import type { SavingsFund } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { DECIMAL_INPUT_PATTERN, parseDecimalInput } from '../transactions/helpers';

/**
 * Optional "balance of each savings fund after the last transaction in this file". Fills in
 * money that was already in a fund before the file; the account balance is not affected.
 */
export function FundBalancesField({
  funds,
  values,
  onChange,
  dateTo,
  currency,
}: {
  funds: SavingsFund[];
  values: Record<string, string>;
  onChange: (fundId: string, value: string) => void;
  dateTo: string | null;
  currency: string;
}) {
  const { t, formatDate } = useUser();
  const date = dateTo ? formatDate(dateTo, { dateStyle: 'medium' }) : null;

  if (funds.length === 0) return null;
  return (
    <div className="mt-3 space-y-4">
      {funds.map((fund) => {
        const id = `statement-fund-balance-${fund.savings_funds_id_pk}`;
        const value = values[fund.savings_funds_id_pk] ?? '';
        const invalid = value.trim() !== '' && parseDecimalInput(value) === null;
        const label = date
          ? t('pages.statementImport.fundBalanceLabelDated', { fund: fund.fund_name, date })
          : t('pages.statementImport.fundBalanceLabel', { fund: fund.fund_name });
        return (
          <div key={fund.savings_funds_id_pk}>
            <label htmlFor={id} className="mb-1.5 block text-[0.8125rem]">
              {label}
            </label>
            <div className="flex items-center gap-3">
              <Input
                id={id}
                type="text"
                inputMode="decimal"
                pattern={DECIMAL_INPUT_PATTERN}
                value={value}
                onChange={(e) => onChange(fund.savings_funds_id_pk, e.target.value)}
                placeholder={t('pages.statementImport.balancePlaceholder')}
                aria-invalid={invalid}
                className={cn('min-w-0 flex-1 tabular-nums', invalid && 'border-destructive')}
              />
              <span className="text-sm text-muted-foreground">{currency}</span>
            </div>
            {invalid && <p role="alert" className="mt-1 text-xs text-destructive">{t('pages.statementImport.balanceInvalid')}</p>}
          </div>
        );
      })}
    </div>
  );
}
