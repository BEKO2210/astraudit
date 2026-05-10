/**
 * Dashboard skeleton.
 *
 * Mirrors the structural layout the real dashboard will paint into
 * (overview header, score ring, story grid, insights grid, audit
 * graph, findings list, dependency / structure cards, maintenance
 * with heatmap, onboarding, recommendations) so users see no
 * position or size shift the moment data arrives.
 *
 * Every block is `aria-hidden`. The accessible loading text lives
 * in `LoadingAudit` which wraps this component in a polite live
 * region.
 */

import { Skeleton } from "./Skeleton";

export function DashboardSkeleton() {
  return (
    <div aria-hidden className="mt-8 space-y-6">
      {/* Overview header — avatar + repo name + topic chips + stat grid */}
      <section className="glass p-5 sm:p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3 max-w-sm rounded-md" />
              <Skeleton className="h-3 w-3/4 max-w-md rounded-md" />
              <div className="flex flex-wrap gap-1.5 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    inline
                    className="h-4 w-12 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <Skeleton className="h-2 w-12 rounded-sm" />
              <Skeleton className="mt-2 h-4 w-16 rounded-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Score + verdict block */}
      <section className="glass p-5 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[260px,1fr]">
          <div className="flex flex-col items-center justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
            <Skeleton className="mt-3 h-5 w-24 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-7 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </div>
        </div>
      </section>

      {/* Story grid */}
      <section className="glass p-5 sm:p-6">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 md:col-span-2 xl:col-span-3">
            <Skeleton className="h-3 w-32 rounded-sm" />
            <Skeleton className="mt-3 h-3 w-full rounded-sm" />
            <Skeleton className="mt-2 h-3 w-11/12 rounded-sm" />
            <Skeleton className="mt-2 h-3 w-10/12 rounded-sm" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <Skeleton className="h-3 w-28 rounded-sm" />
              <Skeleton className="mt-3 h-3 w-full rounded-sm" />
              <Skeleton className="mt-2 h-3 w-11/12 rounded-sm" />
              <Skeleton className="mt-2 h-3 w-9/12 rounded-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Insights grid */}
      <section className="glass p-5 sm:p-6">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
            >
              <Skeleton className="h-2 w-16 rounded-sm" />
              <Skeleton className="mt-2 h-4 w-20 rounded-sm" />
              <Skeleton className="mt-1.5 h-3 w-full rounded-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Score breakdown */}
      <section>
        <Skeleton className="mb-3 h-3 w-44 rounded-sm" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="glass relative overflow-hidden p-4 ring-1 ring-white/10"
            >
              <Skeleton className="h-2 w-24 rounded-sm" />
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-3 h-3 w-full rounded-sm" />
              <Skeleton className="mt-2 h-2 w-11/12 rounded-sm" />
            </div>
          ))}
        </div>
      </section>

      {/* Findings */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-5 sm:p-6">
          <Skeleton className="h-4 w-32 rounded-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3 rounded-sm" />
                    <Skeleton className="h-2 w-full rounded-sm" />
                    <Skeleton className="h-2 w-11/12 rounded-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-5 sm:p-6">
          <Skeleton className="h-4 w-44 rounded-md" />
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-md" />
            ))}
          </div>
        </div>
      </section>

      {/* Maintenance with activity heatmap */}
      <section className="glass p-5 sm:p-6">
        <Skeleton className="h-4 w-32 rounded-md" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <Skeleton className="h-2 w-12 rounded-sm" />
              <Skeleton className="mt-1 h-4 w-16 rounded-sm" />
              <Skeleton className="mt-1 h-2 w-20 rounded-sm" />
            </div>
          ))}
        </div>
        {/* Heatmap grid: 12 columns × 7 rows of small squares */}
        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <Skeleton className="h-3 w-40 rounded-sm" />
          <div className="mt-3 flex justify-center gap-[3px]">
            {Array.from({ length: 12 }).map((_, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, row) => (
                  <Skeleton
                    key={row}
                    className="h-[12px] w-[12px] rounded-[3px]"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="glass p-5 sm:p-6">
        <Skeleton className="h-4 w-44 rounded-md" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <Skeleton className="h-7 w-7 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/2 rounded-sm" />
                <Skeleton className="h-2 w-11/12 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
