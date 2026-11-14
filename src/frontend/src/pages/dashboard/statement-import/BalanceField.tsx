import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
import { DECIMAL_INPUT_PATTERN } from '../transactions/helpers';

/**
 * Optional "balance after the last transaction in this file". The backend turns it into one
 * "Starting balance" transaction so the account shows the right balance after the import.
 */
export function BalanceField({
  value,
  onChange,
  dateTo,
  currency,
}: {
  value: string;
  onChange: (value: string) => void;
  dateTo: string | null;
  currency: string;
}) {
  const { t, formatDate } = useUser();
  const label = dateTo
    ? t('pages.statementImport.balanceLabelDated', { date: formatDate(dateTo, { dateStyle: 'medium' }) })
    : t('pages.statementImport.balanceLabel');

  return (
    <div className="max-w-sm">
      <Field htmlFor="statement-balance" label={label} hint={t('pages.statementImport.balanceHint')}>
        <div className="flex items-end gap-3">
          <Input
            id="statement-balance"
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_INPUT_PATTERN}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('pages.statementImport.balancePlaceholder')}
            className="min-w-0 flex-1 tabular-nums"
          />
          <span className="pb-2 text-sm text-muted-foreground">{currency}</span>
        </div>
      </Field>
    </div>
  );
}
