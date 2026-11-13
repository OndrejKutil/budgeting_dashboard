import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder shaped like the group headings and rows below the page header. */
export function AccountsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-in fade-in">
      {[3, 2].map((rows, group) => (
        <div key={group} className="mt-10 first:mt-0">
          <div className="flex items-baseline justify-between border-b border-foreground/30 pb-3">
            <Skeleton className="h-[1.5rem] w-40" />
            <Skeleton className="h-[1.5rem] w-32" />
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 border-b border-border py-4 lg:pl-[1.375rem]">
              <div className="space-y-2">
                <Skeleton className="h-[1.0625rem] w-36" />
                <Skeleton className="h-[0.8125rem] w-20" />
              </div>
              <Skeleton className="hidden h-[1.625rem] w-[5.25rem] lg:block" />
              <Skeleton className="h-[1.75rem] w-40" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
