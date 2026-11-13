import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { formatMoneyParts } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface MoneyFigureProps {
  amount: number;
  currency: string;
  /** Size, weight and tracking come from the caller. */
  className?: string;
}

/** An amount with its currency symbol set smaller and muted, the way the mockup draws balances. Red below zero. */
export function MoneyFigure({ amount, currency, className }: MoneyFigureProps) {
  const parts = formatMoneyParts(amount, currency, 2);
  return (
    <span className={cn('whitespace-nowrap tabular-nums', amount < 0 && 'text-destructive', className)}>
      <SensitiveValue>
        {parts.map((part, index) => {
          if (part.type === 'currency') {
            return (
              <span
                key={index}
                className={cn('text-[0.6em] text-muted-foreground', index === 0 ? 'mr-[0.3125rem]' : 'ml-[0.3125rem]')}
              >
                {part.value}
              </span>
            );
          }
          const nextToCurrency = parts[index - 1]?.type === 'currency' || parts[index + 1]?.type === 'currency';
          if (part.type === 'literal' && nextToCurrency) return null;
          return <span key={index}>{part.value}</span>;
        })}
      </SensitiveValue>
    </span>
  );
}
