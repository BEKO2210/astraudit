import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import type { Finding, FindingCategory, Severity } from "../types/finding";
import { FindingCard } from "./FindingCard";
import { severityRank } from "../lib/utils/severity";

interface FindingsPanelProps {
  findings: Finding[];
}

const SEVERITY_OPTIONS: Array<{ key: Severity | "all"; label: string }> = [
  { key: "all", label: "All severities" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "info", label: "Info" },
];

const CATEGORY_OPTIONS: Array<{ key: FindingCategory | "all"; label: string }> = [
  { key: "all", label: "All categories" },
  { key: "security", label: "Security" },
  { key: "documentation", label: "Documentation" },
  { key: "quality", label: "Quality" },
  { key: "ci", label: "CI/CD" },
  { key: "structure", label: "Structure" },
  { key: "ecosystem", label: "Ecosystem" },
  { key: "maintenance", label: "Maintenance" },
  { key: "dx", label: "DX" },
];

export function FindingsPanel({ findings }: FindingsPanelProps) {
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [category, setCategory] = useState<FindingCategory | "all">("all");

  const filtered = useMemo(() => {
    return findings
      .filter((f) => severity === "all" || f.severity === severity)
      .filter((f) => category === "all" || f.category === category)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  }, [findings, severity, category]);

  return (
    <section className="glass p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-aurora-violet" />
          <h3 className="text-sm font-semibold text-white">
            Findings ({findings.length})
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | "all")}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key} className="bg-ink-800">
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as FindingCategory | "all")
            }
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key} className="bg-ink-800">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">
            No findings match the current filters.
          </p>
        ) : (
          filtered.map((f) => <FindingCard key={f.id} finding={f} />)
        )}
      </div>
    </section>
  );
}
