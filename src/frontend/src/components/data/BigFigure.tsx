import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { cn } from '@/lib/utils';

interface BigFigureProps {
  /** Small caption above the figure. */
  label: string;
  /** The amount as Intl parts; the currency is set smaller and muted beside the number. */
  parts: Intl.NumberFormatPart[];
  negative?: boolean;
  className?: string;
}

/** The one large, light figure a page opens with. */
export function BigFigure({ label, parts, negative = false, className }: BigFigureProps) {
  const digits = parts
    .filter((part) => part.type !== 'currency' && part.type !== 'literal')
    .map((part) => part.value)
    .join('').length;
  // Seven-figure amounts would overflow the left column at full size.
  const compact = digits > 8;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[0.8125rem] text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mb-[1.125rem] mt-1.5 whitespace-nowrap font-light tracking-[-0.045em] tabular-nums',
          negative ? 'text-destructive' : 'text-foreground',
          compact ? 'text-[2.75rem] sm:text-[3.75rem] lg:text-[4.5rem]' : 'text-[3.5rem] sm:text-[5.25rem] lg:text-[6.5rem]',
          // After the font-size classes: tailwind-merge drops a leading class that precedes a text-size one.
          'leading-[0.95]',
        )}
      >
        <SensitiveValue>
          {parts.map((part, index) => {
            if (part.type === 'currency') {
              return (
                <span
                  key={index}
                  className={cn(
                    'text-[0.38em] tracking-[-0.02em] text-muted-foreground',
                    index === 0 ? 'mr-[0.25em]' : 'ml-[0.25em]',
                  )}
                >
                  {part.value}
                </span>
              );
            }
            // The space between number and currency symbol is replaced by the margin above.
            const neighbourIsCurrency = parts[index - 1]?.type === 'currency' || parts[index + 1]?.type === 'currency';
            if (part.type === 'literal' && neighbourIsCurrency) return null;
            return <span key={index}>{part.value}</span>;
          })}
        </SensitiveValue>
      </div>
    </div>
  );
}
