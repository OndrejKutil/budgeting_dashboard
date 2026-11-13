import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder shaped like the funds page below its header: headline, sentence, sort line, rows. */
export function FundsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-in fade-in">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mb-[1.125rem] mt-2 h-[3.375rem] w-56 sm:h-[5rem] lg:h-[6rem] lg:w-80" />
      <Skeleton className="h-5 w-full max-w-[26rem]" />
      <Skeleton className="mt-2 h-5 w-3/5 max-w-[18rem]" />

      <Skeleton className="mb-3 mt-10 h-4 w-64 max-w-full" />
      <div aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-b border-border py-4 md:grid-cols-[3px_minmax(0,1fr)_11.875rem_auto_2rem] md:gap-x-[1.375rem]"
          >
            <Skeleton className="row-span-2 h-full min-h-10 w-[3px] md:row-span-1" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="col-span-2 col-start-2 row-start-2 h-3.5 w-28 md:col-span-1 md:col-start-3 md:row-start-1 md:ml-auto" />
            <Skeleton className="col-start-3 row-start-1 ml-auto h-7 w-24 md:col-start-4 md:h-9 md:w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
