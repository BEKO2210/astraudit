import { ShieldAlert } from "lucide-react";
import type { Finding } from "../types/finding";
import { severityClass, severityLabel } from "../lib/utils/severity";

interface FindingCardProps {
  finding: Finding;
}

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white">{finding.title}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className={`pill border ${severityClass(finding.severity)}`}
              >
                {severityLabel(finding.severity)}
              </span>
              <span className="pill text-slate-300">
                {finding.category}
              </span>
              <span className="pill text-slate-400">
                Confidence: {finding.confidence}
              </span>
            </div>
          </div>
        </div>
      </header>
      <p className="mt-3 text-sm text-slate-300/85">{finding.description}</p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <dt className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Evidence
          </dt>
          <dd className="mt-1 text-slate-300">{finding.evidence}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <dt className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Recommendation
          </dt>
          <dd className="mt-1 text-slate-300">{finding.recommendation}</dd>
        </div>
      </dl>
      {finding.affectedFiles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {finding.affectedFiles.slice(0, 6).map((file) => (
            <code
              key={file}
              className="max-w-full break-all rounded-md border border-white/5 bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-slate-300"
            >
              {file}
            </code>
          ))}
        </div>
      ) : null}
    </article>
  );
}
