/**
 * Suspense fallback for the lazy-loaded `<AuditGraph />` (Phase 4.4).
 *
 * Mirrors the audit graph's outer chrome — the same glass card, the
 * same toolbar height, an inert canvas the same size as the live
 * graph viewport — so the layout doesn't reflow when the lazy chunk
 * resolves. The shimmer cells fade in via the existing skeleton
 * primitive (Phase 2.8.2).
 */

import { Network } from "lucide-react";
import { Skeleton } from "./Skeleton";

export function AuditGraphSkeleton() {
  return (
    <section
      className="glass overflow-hidden print:hidden"
      aria-label="Loading audit graph"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-aurora-cyan" />
          <h3 className="text-sm font-semibold text-white">Audit graph</h3>
          <span className="text-[11px] text-slate-500">loading…</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 px-6 py-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-0 lg:grid-cols-[1fr,320px]">
        <div className="relative h-[480px] bg-[radial-gradient(circle_at_50%_50%,rgba(122,92,255,0.06),transparent_60%)]">
          {/* A handful of node-shaped placeholders scattered across
              the canvas, mirroring the actual graph's visual rhythm. */}
          <Skeleton className="absolute left-[10%] top-[18%] h-12 w-44 rounded-xl" />
          <Skeleton className="absolute left-[36%] top-[12%] h-12 w-44 rounded-xl" />
          <Skeleton className="absolute left-[62%] top-[18%] h-12 w-44 rounded-xl" />
          <Skeleton className="absolute left-[8%] top-[52%] h-12 w-44 rounded-xl" />
          <Skeleton className="absolute left-[34%] top-[58%] h-12 w-44 rounded-xl" />
          <Skeleton className="absolute left-[60%] top-[52%] h-12 w-44 rounded-xl" />
        </div>
        <aside className="space-y-3 border-t border-white/5 p-5 lg:border-l lg:border-t-0">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-9/12" />
          <Skeleton className="mt-4 h-20 w-full rounded-lg" />
        </aside>
      </div>
    </section>
  );
}
