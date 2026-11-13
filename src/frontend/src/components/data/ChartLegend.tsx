import { cn } from '@/lib/utils';

export interface ChartLegendItem {
  label: string;
  dashed?: boolean;
}

/** Legend as plain inline text with a short line sample, no box. */
export function ChartLegend({ items, className }: { items: ChartLegendItem[]; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-x-[1.125rem] gap-y-1 text-[0.8125rem] text-muted-foreground', className)}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <i
            className={cn(
              'inline-block h-0 w-4 border-t-2',
              item.dashed ? 'border-dashed border-muted-foreground/70' : 'border-primary',
            )}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </span>
  );
}
