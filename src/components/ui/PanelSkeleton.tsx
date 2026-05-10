/**
 * <PanelSkeleton /> — Phase 6.4.
 *
 * Shared shimmer placeholder for lazy-loaded dashboard panels and any
 * surface that briefly waits for content before mounting. Sized to the
 * same `glass` slot the live panel uses so the surrounding layout
 * never reflows when the real content arrives.
 *
 * Why this exists:
 *   AuditGraphSkeleton already mirrors the graph chrome exactly. Phase
 *   6.16 lazy-loaded BadgeDialog / CompareDashboard / CommandPalette /
 *   the legal pages, all of which fell back to `null` in their
 *   <Suspense>. That was fine for modals (they only mount on user
 *   action) but it caused a visible blank gap when the compare or
 *   legal route flipped on. Wrapping those routes in a PanelSkeleton
 *   gives the user a consistent "loading" affordance during the chunk
 *   fetch instead of an empty viewport.
 *
 * Design choices:
 *   - 5 shimmer rows by default — enough to read as "panel coming",
 *     few enough to not dominate the screen on a fast load.
 *   - Header strip mirrors the typical `glass` panel chrome: small
 *     icon block + a 60% width title bar.
 *   - All shimmer cells inherit `aria-hidden` from <Skeleton>; the
 *     surrounding section carries an aria-label so SR users hear
 *     "Loading X" once.
 *   - Pure CSS animation (skeleton-shimmer in globals.css), already
 *     respects prefers-reduced-motion.
 */

import { Skeleton } from "../Skeleton";

interface PanelSkeletonProps {
  /** Aria label announced to screen readers, e.g. "Loading compare dashboard". */
  label?: string;
  /** How many body rows to render. Defaults to 5. */
  rows?: number;
  /** Optional extra classes on the outer section. */
  className?: string;
}

export function PanelSkeleton({
  label = "Loading panel",
  rows = 5,
  className = "",
}: PanelSkeletonProps) {
  return (
    <section
      className={`glass p-5 sm:p-6 ${className}`}
      aria-label={label}
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-4 w-3/5 max-w-xs rounded-md" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            // Each successive row is slightly shorter so the block reads
            // as varied content rather than a uniform bar stack.
            className={`h-3 rounded-md ${
              i === rows - 1 ? "w-7/12" : i % 2 === 0 ? "w-full" : "w-11/12"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
