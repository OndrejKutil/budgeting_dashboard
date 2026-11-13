import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { useUser } from '@/contexts/user-context';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { isZeroAmount } from './helpers';

/** "+480,00 Kč this month" in green, "-5 210,00 Kč this month" in red, or a muted "no change". */
export function FlowText({ value, currency, className }: { value: number; currency: string; className?: string }) {
  const { t } = useUser();

  if (isZeroAmount(value)) {
    return <span className={cn('text-muted-foreground', className)}>{t('pages.accounts.noChange')}</span>;
  }

  const amount = `${value > 0 ? '+' : ''}${formatMoney(value, currency)}`;
  return (
    <span className={cn('whitespace-nowrap tabular-nums', value > 0 ? 'text-success' : 'text-destructive', className)}>
      <SensitiveValue>{t('pages.accounts.monthFlow', { amount })}</SensitiveValue>
    </span>
  );
}
