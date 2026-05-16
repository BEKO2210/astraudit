import { ChevronRight, Info } from "lucide-react";
import type { CategoryScore } from "../types/audit";

interface ScoreBreakdownProps {
  categories: CategoryScore[];
}

const STATUS_COLOR: Record<CategoryScore["status"], string> = {
  strong: "from-aurora-mint/30 to-aurora-mint/0",
  partial: "from-aurora-violet/30 to-aurora-violet/0",
  weak: "from-aurora-amber/30 to-aurora-amber/0",
  missing: "from-risk-critical/30 to-risk-critical/0",
  "not-detected": "from-slate-400/15 to-slate-400/0",
  info: "from-aurora-cyan/30 to-aurora-cyan/0",
  // Phase 7.0.5 — `unknown` (public surface lacks the data) and
  // `not-applicable` (file/pattern doesn't belong on this stack)
  // are deliberately neutral. They aren't penalties — the slate
  // wash matches `not-detected` and reads as "no opinion".
  unknown: "from-slate-400/15 to-slate-400/0",
  "not-applicable": "from-slate-400/15 to-slate-400/0",
};

const RING_COLOR: Record<CategoryScore["status"], string> = {
  strong: "ring-aurora-mint/40",
  partial: "ring-aurora-violet/40",
  weak: "ring-aurora-amber/40",
  missing: "ring-risk-critical/40",
  "not-detected": "ring-white/10",
  info: "ring-aurora-cyan/40",
  unknown: "ring-white/10",
  "not-applicable": "ring-white/10",
};

/**
 * Phase 7.0.5 — short text badge rendered in the per-category card
 * for the new verdict states. Default (legacy) statuses don't render
 * a badge: their colour-coded ring + `score/max` is already enough
 * signal. Only the two new states get an explicit label so the
 * dashboard never silently treats them as `missing`.
 */
const STATUS_BADGE_LABEL: Partial<Record<CategoryScore["status"], string>> = {
  unknown: "?",
  "not-applicable": "n/a",
};

/**
 * Phase 5.x — score-transparency upgrade.
 *
 * Each category card now lists EVERY evidence line (was capped at
 * 3, which hid scoring rationale). A new "How is the score
 * calculated?" disclosure panel below the grid documents the
 * per-rule point weights so a sceptical reader can verify exactly
 * which detector contributed which points. The numbers are
 * pulled from `src/lib/audit/scoreEngine.ts`; each category sums
 * to its `max` field after `clamp()`.
 */

interface RuleEntry {
  rule: string;
  pts: string;
}

const RULES_BY_CATEGORY: Record<string, RuleEntry[]> = {
  documentation: [
    { rule: "README present", pts: "+3" },
    { rule: "README mentions install / setup", pts: "+2" },
    { rule: "README mentions usage", pts: "+2" },
    { rule: "README has badges", pts: "+1" },
    { rule: "README has table of contents", pts: "+1" },
    { rule: "README ≥ ~150 words", pts: "+1" },
    { rule: "README headings are well-nested (no h2 → h5 jumps)", pts: "+1" },
    { rule: "CHANGELOG.md present", pts: "+1" },
    { rule: "Public docs/ folder", pts: "+1" },
    { rule: "Repository description set", pts: "+1" },
    { rule: "Repository topics set", pts: "+1" },
  ],
  structure: [
    { rule: "Recognized source dir (src/app/lib)", pts: "+3" },
    { rule: "Test directory or test files", pts: "+2" },
    { rule: "docs/ folder", pts: "+1" },
    { rule: "Root has ≤ 25 files (tidy)", pts: "+2" },
    { rule: "Monorepo signal (turbo / nx / lerna / pnpm-workspaces)", pts: "+1" },
    { rule: "package.json scripts present", pts: "+1" },
    { rule: "Build tooling detected", pts: "+2" },
    { rule: "examples/ or demo/ folder", pts: "+1" },
    { rule: "config/ or infra/ folder", pts: "+1" },
    { rule: "scripts/ folder", pts: "+1" },
  ],
  quality: [
    { rule: "Test files / directories", pts: "+3" },
    { rule: "Test script in package.json", pts: "+1" },
    { rule: "Lint tooling (ESLint / Biome / Stylelint / …)", pts: "+2" },
    { rule: "TypeScript / typecheck script", pts: "+2" },
    { rule: "Format tooling (Prettier / Biome)", pts: "+1" },
    { rule: "CI workflows present", pts: "+2" },
    { rule: "Lockfile detected", pts: "+2" },
    { rule: "Build script", pts: "+1" },
    { rule: "Test framework detected (vitest / jest / pytest / …)", pts: "+1" },
  ],
  security: [
    { rule: "LICENSE file", pts: "+4" },
    { rule: "SECURITY.md (incl. {owner}/.github fallback)", pts: "+3" },
    { rule: "Dependabot config", pts: "+2" },
    { rule: "CodeQL workflow", pts: "+2" },
    { rule: "CODEOWNERS", pts: "+1" },
    { rule: ".env.example (template-only)", pts: "+1" },
    { rule: "Committed .env file", pts: "−2" },
    { rule: "Suspicious filename detected", pts: "−1" },
  ],
  maintenance: [
    { rule: "Pushed within last 7 days", pts: "+3" },
    { rule: "Pushed within last 30 days", pts: "+2" },
    { rule: "Recent commit cadence (≥ 1/week)", pts: "+2" },
    { rule: "Multiple distinct authors recently", pts: "+1" },
    { rule: "Tagged releases", pts: "+2" },
    { rule: "Recent release (last 90 days)", pts: "+2" },
    { rule: "Open-issue ratio looks healthy", pts: "+2" },
    { rule: "Has discussions / wiki / pages enabled", pts: "+1" },
  ],
  dx: [
    { rule: "README mentions install/setup", pts: "+2" },
    { rule: ".env.example", pts: "+1" },
    { rule: "Dockerfile", pts: "+1" },
    { rule: "docker-compose file", pts: "+1" },
    { rule: "Makefile", pts: "+1" },
    { rule: "examples/ or demo/ folder", pts: "+1" },
    { rule: "scripts/ folder", pts: "+1" },
    { rule: "≥ 3 npm scripts", pts: "+1" },
    { rule: "CONTRIBUTING.md", pts: "+1" },
    { rule: "CODE_OF_CONDUCT.md", pts: "+1" },
  ],
  ecosystem: [
    { rule: "Package manager detected", pts: "+2" },
    { rule: "Lockfile", pts: "+2" },
    { rule: "Frameworks detected", pts: "+2" },
    { rule: "Runtime detected (Node / Deno / Python / …)", pts: "+1" },
    { rule: "Build tools detected", pts: "+1" },
    { rule: "Monorepo tooling", pts: "+1" },
    { rule: "Dependency counts visible from manifest", pts: "+1" },
  ],
  ci: [
    { rule: "Has any workflows", pts: "+2" },
    { rule: "Build / verify / quality / CI workflow named", pts: "+1" },
    { rule: "Test / playwright / a11y / lighthouse workflow named", pts: "+1" },
    { rule: "Deploy / release / pages workflow named", pts: "+1" },
  ],
};

export function ScoreBreakdown({ categories }: ScoreBreakdownProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Score breakdown</h3>
        <p className="text-xs text-slate-500">
          Eight categories · 100 max points
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => {
          // Phase 7.0.5 — `unknown` (public surface lacks data) and
          // `not-applicable` (file/pattern doesn't belong on this
          // stack) deliberately suppress the `score/max` digit + the
          // progress bar. Rendering "0/15 · 0%" alongside a `?` or
          // `n/a` badge would still read as "missing" to a glance
          // reader — which is precisely the false-positive 7.0.5
          // exists to remove. The badge tells the whole story.
          const badge = STATUS_BADGE_LABEL[c.status];
          const suppressScore =
            c.status === "unknown" || c.status === "not-applicable";
          const ratio = suppressScore ? 0 : c.score / c.max;
          return (
            <div
              key={c.key}
              className={`glass relative overflow-hidden p-4 ring-1 ${RING_COLOR[c.status]}`}
              data-print-card
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${STATUS_COLOR[c.status]}`}
              />
              <div className="relative">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="uppercase tracking-[0.18em]">{c.label}</span>
                  {badge ? (
                    <span
                      className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-200"
                      aria-label={
                        c.status === "unknown"
                          ? "Unknown — public surface lacks the data"
                          : "Not applicable to this stack"
                      }
                    >
                      {badge}
                    </span>
                  ) : (
                    <span
                      className="font-semibold text-slate-200"
                      aria-label={`${c.score} out of ${c.max} points`}
                    >
                      {c.score}/{c.max}
                    </span>
                  )}
                </div>
                {suppressScore ? null : (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-aurora-violet via-aurora-blue to-aurora-mint"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                )}
                <p className="mt-3 text-sm text-slate-200/90">{c.summary}</p>
                {c.evidence.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {c.evidence.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 5.x — methodology disclosure. The grid above shows
          WHICH detectors fired; this panel shows WHAT each detector
          is worth, so the score isn't a black box. Collapsed by
          default to keep the dashboard scannable. */}
      <details className="glass mt-4 group rounded-2xl p-4 print:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/50 [&::-webkit-details-marker]:hidden">
          <Info className="h-4 w-4 text-aurora-cyan" />
          How is the score calculated?
          <span className="ml-auto text-xs font-normal text-slate-400 transition group-open:rotate-90">
            <ChevronRight className="h-4 w-4" />
          </span>
        </summary>
        <p className="mt-3 text-xs text-slate-400">
          Every category sums up the rules below to its <em>max</em> ceiling.
          A rule fires when its detector returns true; the rule book at{" "}
          <a
            href="#/rules"
            className="text-aurora-violet underline-offset-2 hover:underline"
          >
            /rules
          </a>{" "}
          documents what each detector triggers on. Negative values are
          penalties (e.g. a committed <code>.env</code>).
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {categories.map((c) => {
            const rules = RULES_BY_CATEGORY[c.key] ?? [];
            return (
              <div
                key={c.key}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold uppercase tracking-[0.16em]">
                    {c.label}
                  </span>
                  <span className="text-slate-500">max {c.max}</span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {rules.map((r, idx) => (
                    <li
                      key={idx}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="flex-1">{r.rule}</span>
                      <span
                        className={`shrink-0 font-mono text-[11px] ${
                          r.pts.startsWith("−")
                            ? "text-risk-critical"
                            : "text-aurora-mint"
                        }`}
                      >
                        {r.pts}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
