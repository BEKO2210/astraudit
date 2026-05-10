import { ChevronRight } from "lucide-react";
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
};

const RING_COLOR: Record<CategoryScore["status"], string> = {
  strong: "ring-aurora-mint/40",
  partial: "ring-aurora-violet/40",
  weak: "ring-aurora-amber/40",
  missing: "ring-risk-critical/40",
  "not-detected": "ring-white/10",
  info: "ring-aurora-cyan/40",
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
          const ratio = c.score / c.max;
          return (
            <div
              key={c.key}
              className={`glass relative overflow-hidden p-4 ring-1 ${RING_COLOR[c.status]}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${STATUS_COLOR[c.status]}`}
              />
              <div className="relative">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="uppercase tracking-[0.18em]">{c.label}</span>
                  <span>
                    {c.score}/{c.max}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-aurora-violet via-aurora-blue to-aurora-mint"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-200/90">{c.summary}</p>
                {c.evidence.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {c.evidence.slice(0, 3).map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <ChevronRight className="mt-0.5 h-3 w-3 text-slate-500" />
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
    </section>
  );
}
