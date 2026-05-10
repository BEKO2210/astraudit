/**
 * <SimpleAuditView /> — Phase 5.x non-expert UX.
 *
 * Stripped-down dashboard: score ring, plain-language verdict, the
 * three categories the repo nails, the three the maintainer would
 * fix first, and a single "Show full audit" affordance.
 *
 * Why a separate component instead of conditionally hiding sections
 * inside ReviewDashboard:
 *   - The full dashboard renders ~12 sections; Simple mode renders 4.
 *     Hiding via CSS still pays the React render cost and clutters
 *     the DOM (bad for axe-core / NVDA scan time).
 *   - The verdict copy is *different* — full audit's verdict is
 *     "Strong on documentation, structure, …" (auditor language);
 *     Simple mode reframes it as "Mostly safe to use, but …"
 *     (user-decision language).
 *   - Keeps the cognitive surface consistent: one mode, one screen.
 */

import {
  ArrowRight,
  Check,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import type { AuditResult } from "../types/audit";
import type { CategoryScore } from "../types/audit";
import type { Recommendation } from "../types/audit";

interface SimpleAuditViewProps {
  result: AuditResult;
  /** Switch back to the full dashboard. */
  onShowFullAudit: () => void;
  /** Re-fetch this repo (cache bust). */
  onReaudit?: () => void;
}

interface PlainVerdict {
  headline: string;
  body: string;
  tone: "positive" | "neutral" | "caution" | "negative";
}

/** Map the 0-100 score + the strongest / weakest category mix to a
 *  user-decision verdict ("yes / mostly / careful / no"). The
 *  thresholds line up with the grade bands in `gradeFromScore`,
 *  but the *language* is reframed for non-technical readers. */
function plainVerdict(result: AuditResult): PlainVerdict {
  const { totalScore } = result;
  const weakCats = result.categories
    .filter((c) => c.score / c.max < 0.6)
    .map((c) => c.label);
  const weakClause =
    weakCats.length > 0
      ? ` The biggest gap${weakCats.length === 1 ? "" : "s"}: ${weakCats.slice(0, 2).join(" and ")}.`
      : "";

  if (totalScore >= 90) {
    return {
      tone: "positive",
      headline: "Yes — this looks safe to depend on.",
      body: `Most signals you'd want from a healthy project are present and recent.${weakClause}`,
    };
  }
  if (totalScore >= 75) {
    return {
      tone: "positive",
      headline: "Mostly safe to use.",
      body: `The fundamentals are in place, with only minor gaps.${weakClause} Look at the "What's missing" list before you commit.`,
    };
  }
  if (totalScore >= 60) {
    return {
      tone: "caution",
      headline: "Workable, but check before you depend on it.",
      body: `Several signals are present, but enough are missing that you'll want to verify the gaps yourself.${weakClause}`,
    };
  }
  if (totalScore >= 45) {
    return {
      tone: "caution",
      headline: "Be careful.",
      body: `Critical signals such as license, tests, or maintenance activity look weak. If you depend on this, plan for the gaps.${weakClause}`,
    };
  }
  return {
    tone: "negative",
    headline: "Not recommended without further investigation.",
    body: `Too many trust and quality signals are missing.${weakClause}`,
  };
}

const VERDICT_TONE: Record<PlainVerdict["tone"], string> = {
  positive: "border-aurora-mint/40 bg-aurora-mint/[0.04]",
  neutral: "border-aurora-violet/40 bg-aurora-violet/[0.04]",
  caution: "border-aurora-amber/40 bg-aurora-amber/[0.04]",
  negative: "border-risk-critical/40 bg-risk-critical/[0.04]",
};

const VERDICT_ICON: Record<PlainVerdict["tone"], typeof ShieldCheck> = {
  positive: ShieldCheck,
  neutral: ShieldCheck,
  caution: ShieldAlert,
  negative: ShieldAlert,
};

/** Pick the top three categories by score-ratio (strengths). */
function pickStrengths(categories: CategoryScore[]): CategoryScore[] {
  return [...categories]
    .sort((a, b) => b.score / b.max - a.score / a.max)
    .slice(0, 3);
}

/** Pick the bottom three categories by score-ratio (weaknesses).
 *  When everything is strong, returns fewer — we don't pad with
 *  "well, this 14/15 category is the weakest". */
function pickWeaknesses(categories: CategoryScore[]): CategoryScore[] {
  return [...categories]
    .filter((c) => c.score / c.max < 0.85)
    .sort((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 3);
}

export function SimpleAuditView({
  result,
  onShowFullAudit,
  onReaudit,
}: SimpleAuditViewProps) {
  const verdict = plainVerdict(result);
  const VerdictIcon = VERDICT_ICON[verdict.tone];
  const strengths = pickStrengths(result.categories);
  const weaknesses = pickWeaknesses(result.categories);
  const topRecs = result.recommendations.slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <header className="glass relative overflow-hidden p-5 sm:p-6">
        <div className="grid gap-6 sm:grid-cols-[160px,1fr] sm:items-center">
          <div className="mx-auto sm:mx-0">
            <ScoreRing
              score={result.totalScore}
              max={result.maxScore}
              grade={result.grade}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {result.bundle.metadata.fullName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
              {verdict.headline}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300/85 sm:text-base">
              {verdict.body}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onShowFullAudit}
                className="inline-flex items-center gap-1.5 rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-3 py-1 font-medium text-aurora-violet transition hover:bg-aurora-violet/20"
              >
                Show full audit
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              {onReaudit ? (
                <button
                  type="button"
                  onClick={onReaudit}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  Re-audit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section
        className={`glass border-l-2 ${VERDICT_TONE[verdict.tone]} p-5 sm:p-6`}
      >
        <div className="flex items-start gap-3">
          <VerdictIcon className="h-5 w-5 shrink-0 text-white" />
          <div>
            <h2 className="text-sm font-semibold text-white">
              What this means
            </h2>
            <p className="mt-1 text-sm text-slate-300/85">
              Astraudit checks 8 categories across about 70 rule-based
              detectors — documentation, structure, code-quality signals,
              security, maintenance, developer experience, ecosystem, and
              CI/CD. The headline above summarises that mix.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="glass p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Check className="h-4 w-4 text-aurora-mint" />
            What this repo gets right
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {strengths.map((c) => (
              <li
                key={c.key}
                className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-aurora-mint" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{c.label}</span>
                    <span className="text-xs text-slate-400">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{c.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert className="h-4 w-4 text-aurora-amber" />
            What's missing
          </h3>
          {weaknesses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-300">
              Nothing meaningful — every category is in good shape. Use the
              full audit if you want to see the per-rule detail.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {weaknesses.map((c) => (
                <li
                  key={c.key}
                  className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-aurora-amber" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">
                        {c.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {c.score}/{c.max}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{c.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {topRecs.length > 0 ? (
        <section className="glass p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white">
            What a maintainer would fix first
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Three actions ordered by impact, drawn from the full audit's
            recommendations list.
          </p>
          <ol className="mt-4 space-y-3 text-sm text-slate-300">
            {topRecs.map((r: Recommendation, i) => (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{r.title}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-400">
                      {r.impact} impact
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{r.rationale}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        Want the full breakdown? <button
          type="button"
          onClick={onShowFullAudit}
          className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Switch to the full audit
        </button>
        .
      </p>
    </div>
  );
}
