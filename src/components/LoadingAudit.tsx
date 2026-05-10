import { CheckCircle2, Loader2, Circle } from "lucide-react";
import type { AuditProgressStep } from "../types/audit";

const STEPS: Array<{ key: AuditProgressStep; label: string }> = [
  { key: "metadata", label: "Reading repository metadata" },
  { key: "tree", label: "Mapping file tree" },
  { key: "stack", label: "Detecting stack" },
  { key: "documentation", label: "Scanning documentation" },
  { key: "quality", label: "Evaluating quality signals" },
  { key: "graph", label: "Building audit graph" },
  { key: "recommendations", label: "Generating recommendations" },
];

interface LoadingAuditProps {
  step: AuditProgressStep | null;
  repoLabel: string;
}

const ORDER: AuditProgressStep[] = [
  "metadata",
  "tree",
  "stack",
  "documentation",
  "quality",
  "graph",
  "recommendations",
  "done",
];

export function LoadingAudit({ step, repoLabel }: LoadingAuditProps) {
  const currentIndex = step ? ORDER.indexOf(step) : 0;

  return (
    <section className="mt-10">
      <div className="glass relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(122,92,255,0.18),transparent)] bg-[length:200%_100%] animate-shimmer" />
        <div className="relative">
          <p className="card-title">Analyzing</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{repoLabel}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Astraudit reads only public metadata and known config files. Nothing
            is executed.
          </p>

          <ul className="mt-6 space-y-3">
            {STEPS.map((s, idx) => {
              const isDone = idx < currentIndex || step === "done";
              const isActive = idx === currentIndex && step !== "done";
              return (
                <li key={s.key} className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-aurora-mint" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-aurora-violet" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-600" />
                  )}
                  <span
                    className={
                      isDone
                        ? "text-sm text-slate-300"
                        : isActive
                          ? "text-sm font-medium text-white"
                          : "text-sm text-slate-500"
                    }
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
