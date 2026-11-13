import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder shaped like the redesigned Overview content (headline, sentence, bar, rows,
 * chart, latest). The page header with the month navigator is rendered by the page itself,
 * so this covers everything below it and the layout does not jump when data arrives.
 */
export function OverviewSkeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-in fade-in">
      <div className="items-end gap-x-[4.5rem] lg:grid lg:grid-cols-[1.25fr_1fr]">
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mb-[1.125rem] mt-2 h-[3.375rem] w-56 sm:h-[5rem] lg:h-[6rem] lg:w-80" />
          <Skeleton className="h-5 w-full max-w-[26rem]" />
          <Skeleton className="mt-2 h-5 w-4/5 max-w-[22rem]" />
          <Skeleton className="mt-2 h-5 w-3/5 max-w-[16rem]" />
          <Skeleton className="mt-7 h-2 w-full" />
          <div className="mt-2 flex gap-6">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
        <div className="mt-10 lg:mt-0">
          <Skeleton className="mb-2 h-4 w-24" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 gap-x-[4.5rem] lg:mt-11 lg:grid lg:grid-cols-[1.25fr_1fr]">
        <div>
          <Skeleton className="mb-2 h-4 w-56" />
          <Skeleton className="h-[11.875rem] w-full" />
        </div>
        <div className="mt-10 lg:mt-0">
          <Skeleton className="mb-2 h-4 w-16" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between py-[0.6875rem]">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
