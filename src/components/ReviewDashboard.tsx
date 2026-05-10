import { Award } from "lucide-react";
import type { AuditResult } from "../types/audit";
import { OverviewHeader } from "./OverviewHeader";
import { ScoreRing } from "./ScoreRing";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { RepoStory } from "./RepoStory";
import { FindingsPanel } from "./FindingsPanel";
import { AuditGraph } from "./AuditGraph";
import { FileStructurePanel } from "./FileStructurePanel";
import { DependencyPanel } from "./DependencyPanel";
import { SecurityPanel } from "./SecurityPanel";
import { MaintenancePanel } from "./MaintenancePanel";
import { RecommendationsPanel } from "./RecommendationsPanel";

interface ReviewDashboardProps {
  result: AuditResult;
}

export function ReviewDashboard({ result }: ReviewDashboardProps) {
  const securityCategory = result.categories.find((c) => c.key === "security");

  return (
    <div className="mt-8 space-y-6">
      <OverviewHeader metadata={result.bundle.metadata} />

      <section className="glass relative overflow-hidden p-6">
        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <div className="flex flex-col items-center justify-center">
            <ScoreRing
              score={result.totalScore}
              max={result.maxScore}
              grade={result.grade}
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
              <Award className="h-3.5 w-3.5 text-aurora-mint" />
              Astraudit verdict
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              {result.grade}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-300/90">
              {result.verdict}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Generated {new Date(result.generatedAt).toLocaleString()} ·{" "}
              {result.findings.length} findings · {result.recommendations.length}{" "}
              recommended next steps
            </p>
          </div>
        </div>
      </section>

      <RepoStory story={result.story} />

      <ScoreBreakdown categories={result.categories} />

      <AuditGraph graph={result.graph} />

      <div className="grid gap-6 lg:grid-cols-2">
        <FindingsPanel findings={result.findings} />
        <FileStructurePanel structure={result.fileStructure} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DependencyPanel stack={result.stack} />
        {securityCategory ? <SecurityPanel category={securityCategory} /> : null}
      </div>

      <MaintenancePanel bundle={result.bundle} />

      <RecommendationsPanel recommendations={result.recommendations} />
    </div>
  );
}
