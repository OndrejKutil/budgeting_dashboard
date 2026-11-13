import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder shaped like the Monthly analytics content: figure row, daily strip and three
 * lists. The page header with the period navigator is rendered by the page itself.
 */
export function MonthlyAnalyticsSkeleton({ label }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="animate-in fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`py-1 pr-4 lg:px-7 lg:py-0 ${i % 2 === 1 ? 'border-l border-border pl-4' : ''} ${i >= 2 ? 'mt-4 border-t border-border pt-4 lg:mt-0 lg:border-t-0 lg:pt-0' : ''} ${i === 0 ? 'lg:pl-0' : 'lg:border-l lg:border-border'}`}
          >
            <Skeleton className="h-[0.9rem] w-[5rem]" />
            <Skeleton className="mt-2 h-[2rem] w-[7rem]" />
            <Skeleton className="mt-2 h-[0.9rem] w-[8rem] max-w-full" />
          </div>
        ))}
      </div>

      <div className="mt-11">
        <Skeleton className="mb-2 h-[0.9rem] w-[9rem]" />
        <Skeleton className="h-[8.75rem] w-full" />
      </div>

      <div className="mt-11 grid gap-x-14 gap-y-10 lg:grid-cols-[1.1fr_1fr_1fr]">
        {Array.from({ length: 3 }, (_, column) => (
          <div key={column}>
            <Skeleton className="mb-2 h-[0.9rem] w-[7rem]" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-3">
                <Skeleton className="h-[1rem] w-[6rem]" />
                <Skeleton className="h-[1rem] w-[4rem]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
