import { Skeleton } from '@/components/ui/skeleton';

const SECTION_ROWS = [3, 4, 2, 1];

/** Placeholder shaped like the budget table: one quiet summary line, then four sections of hairline rows. */
export function BudgetMakerSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mt-5 h-4 w-full max-w-md" />

      <div className="mt-6">
        <div className="hidden items-center gap-x-3 border-b border-border pb-2.5 lg:flex">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="ml-auto h-3.5 w-24" />
        </div>

        <div>
        {SECTION_ROWS.map((count, section) => (
          <div key={section} className="mt-9 first:mt-4">
            <div className="flex items-center justify-between gap-3 border-b border-foreground/20 pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: count }, (_, row) => (
              <div key={row} className="flex items-center gap-4 border-b border-border py-3.5">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-32 sm:w-44" />
                <Skeleton className="hidden h-3.5 w-36 lg:block" />
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="hidden h-4 w-16 sm:block" />
              </div>
            ))}
            <Skeleton className="mt-3 h-3.5 w-20" />
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
