/**
 * <EmptyFindingsCelebration /> — celebratory empty state.
 *
 * Phase 2.8.5 design notes (Pencil & Paper, Eleken, Intuit Content
 * Design, UI Deploy 2025 guide, Sara Soueidan + MDN on ARIA live
 * regions, catdad/canvas-confetti issue #114 on reduced motion):
 *
 * - Empty states fall into three categories: informational,
 *   action-oriented, and celebratory. Zero findings is the celebratory
 *   case — Astraudit's rule-based detectors found nothing to flag, so
 *   the screen reads as success feedback rather than a sad "no data"
 *   blank.
 * - Short, specific copy ("All clear · 0 findings detected") + clear
 *   CTAs (Compare, Share). Avoid generic "No findings" phrasing that
 *   reads like a missing data placeholder.
 * - Sparkle accents and a glow ring use existing `pulseRing` /
 *   `floaty` keyframes. Everything is wrapped in `motion-safe:` so
 *   `prefers-reduced-motion: reduce` users see static art only —
 *   confetti / particle libraries famously ignore the preference, so
 *   we deliberately stay CSS-only.
 * - ARIA: outer container is `role="status"` + `aria-live="polite"`
 *   so screen readers get the success announcement once.
 * - The card is fully self-contained, mounted from `FindingsPanel`
 *   when `findings.length === 0`, and works equally on dark + light
 *   themes thanks to the existing semantic colour tokens.
 *
 * Sources:
 *   - https://www.pencilandpaper.io/articles/empty-states
 *   - https://www.eleken.co/blog-posts/empty-state-ux
 *   - https://contentdesign.intuit.com/product-and-ui/empty-states/
 *   - https://github.com/catdad/canvas-confetti/issues/114
 *   - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions
 */

import {
  ArrowLeftRight,
  PartyPopper,
  ShieldCheck,
  Sparkles as SparkleIcon,
  Star,
} from "lucide-react";

interface EmptyFindingsCelebrationProps {
  /** Repository name for the announcement ("All clear for owner/repo"). */
  repoFullName: string;
  /** Audit score, surfaced as a quick re-affirmation. */
  score: number;
  max: number;
  /** Optional handler — when provided, a "Compare with another repo"
   *  CTA appears. */
  onOpenCompare?: () => void;
}

export function EmptyFindingsCelebration({
  repoFullName,
  score,
  max,
  onOpenCompare,
}: EmptyFindingsCelebrationProps) {
  const announcement = `All clear for ${repoFullName}: 0 findings detected. Score ${score} of ${max}.`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="relative overflow-hidden rounded-xl border border-aurora-mint/30 bg-gradient-to-br from-aurora-mint/[0.07] via-aurora-cyan/[0.04] to-aurora-violet/[0.06] p-6 sm:p-8"
    >
      {/* Decorative sparkle stack — all aria-hidden, only visible to
          sighted users. motion-safe: animations stop completely when
          prefers-reduced-motion is set. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Star className="absolute left-[18%] top-4 h-3 w-3 text-aurora-mint/60 motion-safe:animate-pulseRing" />
        <Star className="absolute right-[14%] top-8 h-4 w-4 text-aurora-cyan/60 motion-safe:animate-floaty" />
        <SparkleIcon className="absolute left-[32%] bottom-5 h-3.5 w-3.5 text-aurora-violet/60 motion-safe:animate-floaty" />
        <SparkleIcon className="absolute right-[22%] bottom-10 h-3 w-3 text-aurora-mint/50 motion-safe:animate-pulseRing" />
      </div>

      <div className="relative flex flex-col items-center gap-3 text-center sm:gap-4">
        {/* Icon medal: a soft glow ring + the party popper. */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-aurora-mint/15 blur-xl motion-safe:animate-pulseRing"
          />
          <div
            aria-hidden
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint sm:h-16 sm:w-16"
          >
            <PartyPopper className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-lg font-semibold text-white sm:text-xl">
            All clear
          </h4>
          <p className="text-sm text-slate-300/90">
            Astraudit's rule-based detectors found nothing to flag for{" "}
            <span className="font-mono text-white">{repoFullName}</span>.
          </p>
          <p className="text-xs text-slate-500">
            That's rare and worth celebrating — license, security policy,
            CI, lockfile, README signals, and structure all came back
            healthy. Findings are static signals though, not a full
            security audit.
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-aurora-mint/40 bg-aurora-mint/10 px-2.5 py-1 font-mono text-aurora-mint"
            aria-label={`Score ${score} of ${max}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {score}/{max}
          </span>
          {onOpenCompare ? (
            <button
              type="button"
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1.5 rounded-full border border-aurora-cyan/40 bg-aurora-cyan/10 px-3 py-1 font-medium text-aurora-cyan transition hover:bg-aurora-cyan/20 print:hidden"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Compare against another repo
            </button>
          ) : null}
        </div>

        {/* Visually-hidden announcement so screen readers that don't
            re-read role=status content still pick the line up. */}
        <span className="sr-only">{announcement}</span>
      </div>
    </div>
  );
}
