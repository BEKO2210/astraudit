/**
 * <LoadingAudit /> — content-shaped loading screen.
 *
 * Phase 2.8.2: replaces the old vertical step-list with a content-
 * shaped <DashboardSkeleton /> that mirrors the eventual layout.
 *
 * Accessibility:
 * - The whole section is `role="status"` `aria-live="polite"` with a
 *   single text line ("Loading audit for owner/repo · Reading file
 *   tree…") so screen readers get the loading announcement without
 *   reading every skeleton block.
 * - `aria-busy="true"` on the wrapper as an extra hint for assistive
 *   tech that does honour it (JAWS).
 * - Skeleton blocks themselves carry `aria-hidden`.
 * - Animation respects `prefers-reduced-motion` via .skeleton-shimmer
 *   in globals.css.
 *
 * The current pipeline step is rendered as a small pill at the top
 * of the skeleton instead of a full step list. This keeps the user
 * informed without doubling-up status text and skeleton.
 */

import { Loader2 } from "lucide-react";
import type { AuditProgressStep } from "../types/audit";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";
import { DashboardSkeleton } from "./DashboardSkeleton";

const STEP_LABEL: Record<AuditProgressStep, string> = {
  metadata: "Reading repository metadata",
  tree: "Mapping file tree",
  stack: "Detecting stack",
  documentation: "Scanning documentation",
  quality: "Evaluating quality signals",
  graph: "Building audit graph",
  recommendations: "Generating recommendations",
  done: "Almost there",
};

interface LoadingAuditProps {
  step: AuditProgressStep | null;
  repoLabel: string;
}

export function LoadingAudit({ step, repoLabel }: LoadingAuditProps) {
  const stepText = step ? STEP_LABEL[step] : STEP_LABEL.metadata;
  const announcement = `Loading audit for ${repoLabel} — ${stepText}.`;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={announcement}
      className={VIEW_ENTER_CLASS}
    >
      {/* Status pill — single source of textual progress info. */}
      <div className="mt-8 flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur sm:max-w-fit">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-aurora-violet" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Auditing
        </span>
        <span className="truncate text-sm font-medium text-white">
          {repoLabel}
        </span>
        <span className="hidden text-slate-500 sm:inline">·</span>
        <span className="hidden truncate text-xs text-slate-400 sm:inline">
          {stepText}
        </span>
      </div>
      {/* On phones the step text moves below the pill so we don't
          truncate it in the chip. */}
      <p className="mt-1.5 break-words text-xs text-slate-400 sm:hidden">
        {stepText}
      </p>

      <DashboardSkeleton />

      {/* Privacy + scope reassurance, kept from the old screen. */}
      <p className="mt-4 text-[11px] text-slate-500">
        Astraudit reads only public metadata and known config files.
        Nothing on the audited repository is executed.
      </p>

      {/* Visually-hidden text that screen readers can pick up if the
          aria-label on the section is ignored. */}
      <span className="sr-only">{announcement}</span>
    </section>
  );
}
