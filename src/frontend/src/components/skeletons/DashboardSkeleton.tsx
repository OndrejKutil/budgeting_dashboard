import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in">
      {/* Page Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Primary KPI Section (Hero Cards) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Large Hero Card 1 */}
        <div className="col-span-2 rounded-2xl border border-border/50 bg-card/30 p-8 shadow-lg overflow-hidden">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-12 w-48 mb-4" />
          <Skeleton className="h-4 w-full max-w-xs" />
          <Skeleton className="h-4 w-full max-w-xs mt-2" />
        </div>

        {/* Large Hero Card 2 */}
        <div className="col-span-2 rounded-2xl border border-border/50 bg-card/30 p-8 shadow-lg overflow-hidden">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-12 w-48 mb-4" />
          <Skeleton className="h-4 w-full max-w-xs" />
          <Skeleton className="h-4 w-full max-w-xs mt-2" />
        </div>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between p-4 rounded-xl border border-border/30 bg-card/30 min-h-[110px]"
          >
            {/* Icon and label */}
            <div className="space-y-2 mb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            {/* Comparison and sparkline */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Featured Insights Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Largest Transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-0 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
          {/* Transaction rows */}
          <div className="divide-y divide-border/30">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Insights Column */}
        <div className="space-y-6">
          {/* Biggest Mover Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>

          {/* Top Expenses */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
