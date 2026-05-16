/**
 * <StickyScoreBar /> — secondary sticky bar that appears once the
 * user scrolls past the Score section.
 *
 * Design notes (Phase 2.8.3):
 *
 * - **IntersectionObserver, not scroll listeners.** Scroll events fire
 *   on every paint and force layout reads; an IO callback runs once
 *   per crossing. (Chrome for Developers, freeCodeCamp forum.)
 * - **`position: fixed`** on the bar itself + a CSS variable to push
 *   the existing `<SectionNav>` down. We can't use `position: sticky`
 *   here because the bar must overlay the page when visible and
 *   disappear from layout when hidden.
 * - **Slide animation** wraps in `motion-safe:` so users with
 *   `prefers-reduced-motion: reduce` get an instant fade.
 * - **WCAG 2.4.11 Focus Not Obscured** is handled at the HTML level
 *   via `scroll-padding-top: calc(56px + var(--sticky-offset))` —
 *   keyboard tab-to focus inside the page never lands under the bar.
 * - **`role="region" aria-label`** so screen readers can locate it.
 * - Only the most needed actions live in the bar — Compare, Share,
 *   Badge, Save as PDF, Copy verdict — to keep the chrome slim
 *   (research recommends 44-50 px on mobile, 50-60 on desktop).
 *
 * Sources informing the design:
 *   - https://developer.chrome.com/docs/css-ui/sticky-headers
 *   - https://www.tpgi.com/prevent-focused-elements-from-being-obscured-by-sticky-headers/
 *   - https://www.parallelhq.com/blog/what-sticky-header
 *   - https://ryanmulligan.dev/blog/sticky-header-scroll-shadow/
 */

import { Award, ArrowLeftRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuditResult } from "../types/audit";
import { CopyButton } from "./CopyButton";
import { PrintButton } from "./PrintButton";
import { ShareButton } from "./ShareButton";
import { Tooltip } from "./ui/Tooltip";

const STICKY_OFFSET_VAR = "--sticky-offset";
const BAR_HEIGHT_PX = 48;

interface StickyScoreBarProps {
  result: AuditResult;
  onOpenCompare?: () => void;
  /** False until the local history holds a second repo to diff
   *  against — keeps the Compare button visible but disabled. */
  canCompare?: boolean;
  onOpenBadge?: () => void;
  /** Element id to observe for the "scrolled past" trigger. */
  observeId?: string;
}

function gradeTone(score: number): string {
  if (score >= 80) return "text-aurora-mint border-aurora-mint/40 bg-aurora-mint/10";
  if (score >= 60) return "text-aurora-cyan border-aurora-cyan/40 bg-aurora-cyan/10";
  if (score >= 45) return "text-risk-medium border-risk-medium/40 bg-risk-medium/10";
  return "text-risk-critical border-risk-critical/40 bg-risk-critical/10";
}

export function StickyScoreBar({
  result,
  onOpenCompare,
  canCompare = true,
  onOpenBadge,
  observeId = "score",
}: StickyScoreBarProps) {
  const [visible, setVisible] = useState(false);

  // Observe the Score section. When it leaves the viewport upwards
  // (entry.boundingClientRect.bottom < the section-nav line), show
  // the sticky bar; otherwise hide it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;
    const target = document.getElementById(observeId);
    if (!target) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // boundingClientRect.bottom is negative when scrolled past.
        const passedTop = entry.boundingClientRect.bottom < 0;
        setVisible(passedTop);
      },
      // rootMargin top accounts for the SectionNav bar (~46 px).
      { rootMargin: "-46px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [observeId]);

  // Push the SectionNav and any other pinned chrome down by exactly
  // BAR_HEIGHT when the bar is visible, back to 0 otherwise. The
  // CSS-variable indirection means stacking is layout-driven — no
  // hard-coded coordinates inside SectionNav.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      STICKY_OFFSET_VAR,
      visible ? `${BAR_HEIGHT_PX}px` : "0px",
    );
    return () => {
      document.documentElement.style.removeProperty(STICKY_OFFSET_VAR);
    };
  }, [visible]);

  const owner = result.bundle.metadata.owner.login;
  const repo = result.bundle.metadata.name;
  const fullName = result.bundle.metadata.fullName;

  const verdictPlain = `Astraudit · ${fullName}\nScore: ${result.totalScore}/${result.maxScore} (${result.grade})\n${result.headline}\n${result.verdict}`;

  return (
    <div
      role="region"
      aria-label="Audit summary"
      data-visible={visible || undefined}
      aria-hidden={visible ? undefined : true}
      style={{ height: BAR_HEIGHT_PX }}
      className={`fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-ink-950/85 backdrop-blur transition-transform duration-200 motion-reduce:transition-none print:hidden ${
        visible
          ? "translate-y-0 pointer-events-auto"
          : "-translate-y-full pointer-events-none"
      }`}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a
          href={result.bundle.metadata.htmlUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400 hover:text-aurora-cyan"
        >
          <span className="truncate font-medium text-white">{fullName}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${gradeTone(result.totalScore)}`}
          aria-label={`Score ${result.totalScore} of ${result.maxScore}, grade ${result.grade}`}
        >
          <span className="font-mono">
            {result.totalScore}
            <span className="text-slate-400">/{result.maxScore}</span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{result.grade}</span>
        </span>

        {/* Action cluster — desktop only. On mobile the SpeedDialFAB
            owns the action surface so this slim bar stays unclutter. */}
        {/* Phase 5.2 — px-2.5 py-1 text-[11px] gave a ~19 px button
            height, under WCAG 2.5.8's 24×24 floor. Bumped to py-1.5
            (now ~26 px) without disturbing the visual rhythm. */}
        <div className="ml-auto hidden items-center gap-1.5 sm:flex">
          {onOpenCompare ? (
            canCompare ? (
              <button
                type="button"
                onClick={onOpenCompare}
                className="inline-flex min-h-[1.625rem] items-center gap-1.5 rounded-full border border-aurora-cyan/40 bg-aurora-cyan/10 px-2.5 py-1 text-[11px] font-medium text-aurora-cyan transition hover:bg-aurora-cyan/20"
                tabIndex={visible ? 0 : -1}
              >
                <ArrowLeftRight className="h-3 w-3" />
                Compare
              </button>
            ) : (
              <Tooltip
                label="Run another audit to enable comparison"
                placement="bottom"
                describe
              >
                <button
                  type="button"
                  aria-disabled="true"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex min-h-[1.625rem] cursor-not-allowed items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-500"
                  tabIndex={visible ? 0 : -1}
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Compare
                </button>
              </Tooltip>
            )
          ) : null}
          <ShareButton coords={{ owner, repo }} />
          {onOpenBadge ? (
            <button
              type="button"
              onClick={onOpenBadge}
              aria-label="Generate badge"
              className="inline-flex min-h-[1.625rem] items-center gap-1.5 rounded-full border border-aurora-mint/40 bg-aurora-mint/10 px-2.5 py-1 text-[11px] font-medium text-aurora-mint transition hover:bg-aurora-mint/20"
              tabIndex={visible ? 0 : -1}
            >
              <Award className="h-3 w-3" />
              Badge
            </button>
          ) : null}
          <CopyButton value={verdictPlain} label="Copy verdict" />
          <PrintButton />
        </div>
      </div>
    </div>
  );
}

export const __test = {
  STICKY_OFFSET_VAR,
  BAR_HEIGHT_PX,
};
