import { CheckCircle2, Sparkles } from "lucide-react";
import type { Recommendation } from "../types/audit";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const IMPACT_LABEL: Record<Recommendation["impact"], string> = {
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
};

const IMPACT_COLOR: Record<Recommendation["impact"], string> = {
  high: "text-aurora-mint border-aurora-mint/40 bg-aurora-mint/10",
  medium: "text-aurora-violet border-aurora-violet/40 bg-aurora-violet/10",
  low: "text-slate-300 border-slate-400/30 bg-slate-400/10",
};

export function RecommendationsPanel({
  recommendations,
}: RecommendationsPanelProps) {
  return (
    <section className="glass p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-aurora-mint" />
        <h3 className="text-sm font-semibold text-white">
          Recommended next steps
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Seven prioritized improvements ordered by likely impact.
      </p>
      <ol className="mt-4 space-y-2">
        {recommendations.map((r, idx) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-xs font-semibold text-white">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-white">
                  {r.title}
                </h4>
                <span
                  className={`pill border ${IMPACT_COLOR[r.impact]}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {IMPACT_LABEL[r.impact]}
                </span>
                <span className="pill text-slate-300">{r.area}</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-300/85">{r.rationale}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
