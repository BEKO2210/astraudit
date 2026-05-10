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
import { InsightsPanel } from "./InsightsPanel";
import { OnboardingPanel } from "./OnboardingPanel";
import { ReadmePreview } from "./ReadmePreview";
import { SectionNav, type SectionItem } from "./SectionNav";

interface ReviewDashboardProps {
  result: AuditResult;
}

const SECTIONS: SectionItem[] = [
  { id: "overview", label: "Overview" },
  { id: "score", label: "Score" },
  { id: "story", label: "Story" },
  { id: "readme", label: "README" },
  { id: "insights", label: "Insights" },
  { id: "graph", label: "Graph" },
  { id: "findings", label: "Findings" },
  { id: "structure", label: "Structure" },
  { id: "stack", label: "Stack" },
  { id: "maintenance", label: "Maintenance" },
  { id: "onboarding", label: "Onboarding" },
  { id: "next", label: "Next steps" },
];

export function ReviewDashboard({ result }: ReviewDashboardProps) {
  const securityCategory = result.categories.find((c) => c.key === "security");

  return (
    <div className="mt-8 space-y-6">
      <SectionNav sections={SECTIONS} />

      <section id="overview">
        <OverviewHeader metadata={result.bundle.metadata} />
      </section>

      <section id="score" className="glass relative overflow-hidden p-5 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[260px,1fr]">
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
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              {result.grade}
            </h3>
            <p className="mt-2 max-w-2xl text-base text-slate-200/95">
              {result.headline}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
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

      <section id="story">
        <RepoStory story={result.story} />
      </section>

      {result.bundle.readme?.content ? (
        <section id="readme">
          <ReadmePreview
            content={result.bundle.readme.content}
            owner={result.bundle.metadata.owner.login}
            repo={result.bundle.metadata.name}
            branch={result.bundle.metadata.defaultBranch}
            htmlUrl={result.bundle.metadata.htmlUrl}
          />
        </section>
      ) : null}

      <section id="insights">
        <InsightsPanel insights={result.insights} />
      </section>

      <section id="graph">
        <AuditGraph graph={result.graph} />
      </section>

      <ScoreBreakdown categories={result.categories} />

      <section id="findings" className="grid gap-6 lg:grid-cols-2">
        <FindingsPanel findings={result.findings} />
        <div id="structure">
          <FileStructurePanel structure={result.fileStructure} />
        </div>
      </section>

      <section id="stack" className="grid gap-6 lg:grid-cols-2">
        <DependencyPanel stack={result.stack} />
        {securityCategory ? <SecurityPanel category={securityCategory} /> : null}
      </section>

      <section id="maintenance">
        <MaintenancePanel bundle={result.bundle} />
      </section>

      <section id="onboarding">
        <OnboardingPanel steps={result.onboarding} />
      </section>

      <section id="next">
        <RecommendationsPanel recommendations={result.recommendations} />
      </section>
    </div>
  );
}
