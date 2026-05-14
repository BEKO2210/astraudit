/**
 * <SignalDetails /> — at-a-glance breakdown of "the eight signals
 * that matter" promised on the landing page.
 *
 * The full <ScoreBreakdown /> below it is the deep view (per-rule
 * evidence + the methodology disclosure). This component is the
 * scannable summary: one compact badge per signal, each carrying an
 * icon, the signal name, its `score/max`, and a colour-coded status
 * word. The styling intentionally borrows the project's two badge
 * idioms — the Aurora gradient accent bar on top of each card and
 * the flat shields.io-style two-cell `score/max` chip — so the
 * surface reads as part of the same badge family.
 *
 * It renders in the full dashboard by default; Simple mode swaps the
 * whole dashboard for <SimpleAuditView />, so the Simple-mode toggle
 * is what shows / hides this section.
 */

import {
  Activity,
  FileText,
  FlaskConical,
  FolderTree,
  Package,
  Rocket,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { CategoryScore, CategoryStatus } from "../types/audit";

interface SignalDetailsProps {
  categories: CategoryScore[];
}

/** One lucide glyph per signal — keyed by the category `key` so the
 *  mapping survives label copy edits. */
const SIGNAL_ICON: Record<string, LucideIcon> = {
  documentation: FileText,
  structure: FolderTree,
  quality: FlaskConical,
  security: ShieldCheck,
  maintenance: Activity,
  dx: Rocket,
  ecosystem: Package,
  ci: Workflow,
};

/** Aurora-style accent wash — mirrors <ScoreBreakdown />'s STATUS_COLOR
 *  tokens so the two surfaces stay visually consistent. */
const STATUS_ACCENT: Record<CategoryStatus, string> = {
  strong: "from-aurora-mint to-aurora-mint/0",
  partial: "from-aurora-violet to-aurora-violet/0",
  weak: "from-aurora-amber to-aurora-amber/0",
  missing: "from-risk-critical to-risk-critical/0",
  "not-detected": "from-slate-400/60 to-slate-400/0",
  info: "from-aurora-cyan to-aurora-cyan/0",
  unknown: "from-slate-400/60 to-slate-400/0",
  "not-applicable": "from-slate-400/60 to-slate-400/0",
};

const STATUS_RING: Record<CategoryStatus, string> = {
  strong: "ring-aurora-mint/40",
  partial: "ring-aurora-violet/40",
  weak: "ring-aurora-amber/40",
  missing: "ring-risk-critical/40",
  "not-detected": "ring-white/10",
  info: "ring-aurora-cyan/40",
  unknown: "ring-white/10",
  "not-applicable": "ring-white/10",
};

const STATUS_TEXT: Record<CategoryStatus, string> = {
  strong: "text-aurora-mint",
  partial: "text-aurora-violet",
  weak: "text-aurora-amber",
  missing: "text-risk-critical",
  "not-detected": "text-slate-400",
  info: "text-aurora-cyan",
  unknown: "text-slate-400",
  "not-applicable": "text-slate-400",
};

const STATUS_LABEL: Record<CategoryStatus, string> = {
  strong: "Strong",
  partial: "Partial",
  weak: "Weak",
  missing: "Missing",
  "not-detected": "Not detected",
  info: "Info",
  unknown: "Unknown",
  "not-applicable": "N/A",
};

export function SignalDetails({ categories }: SignalDetailsProps) {
  return (
    <section aria-labelledby="signal-details-heading">
      <div className="mb-3 flex items-center justify-between">
        <h3
          id="signal-details-heading"
          className="text-sm font-semibold text-white"
        >
          Signal Details
        </h3>
        <p className="text-xs text-slate-500">The eight signals that matter</p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => {
          const Icon = SIGNAL_ICON[c.key] ?? FileText;
          // `unknown` / `not-applicable` deliberately suppress the
          // numeric `score/max` — the same rule <ScoreBreakdown />
          // follows — because "0/15" reads as a penalty when it
          // really means "no opinion".
          const suppressScore =
            c.status === "unknown" || c.status === "not-applicable";
          const valueText = suppressScore
            ? STATUS_LABEL[c.status]
            : `${c.score}/${c.max}`;
          const srValue = suppressScore
            ? STATUS_LABEL[c.status]
            : `${c.score} out of ${c.max} points`;
          return (
            <li
              key={c.key}
              data-print-card
              aria-label={`${c.label}: ${srValue} — ${STATUS_LABEL[c.status]}`}
              className={`glass relative overflow-hidden p-3 ring-1 ${STATUS_RING[c.status]}`}
            >
              {/* Aurora-style accent bar. */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${STATUS_ACCENT[c.status]}`}
              />
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                  <Icon
                    className={`h-3.5 w-3.5 ${STATUS_TEXT[c.status]}`}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-xs font-medium text-white"
                  title={c.label}
                >
                  {c.label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                {/* Flat (shields.io-style) two-cell score chip. */}
                <span
                  aria-hidden="true"
                  className="inline-flex shrink-0 overflow-hidden rounded-md font-mono text-[11px] font-semibold"
                >
                  <span className="bg-white/[0.06] px-1.5 py-0.5 text-slate-300">
                    {suppressScore ? "status" : "score"}
                  </span>
                  <span className="bg-white/[0.03] px-1.5 py-0.5 text-white">
                    {valueText}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`truncate text-[10px] font-semibold uppercase tracking-wider ${STATUS_TEXT[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
