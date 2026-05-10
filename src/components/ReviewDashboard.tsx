import {
  ArrowLeftRight,
  Award,
  Printer as PrinterIcon,
  Share2 as ShareIcon,
} from "lucide-react";
import { useState } from "react";
import { performShare } from "../lib/share/shareAction";
import { pushToast } from "../lib/ui/toastStore";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";
import { SpeedDialFAB, type SpeedDialAction } from "./SpeedDialFAB";
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
import { TopicChecks } from "./TopicChecks";
import { RegistryPanel } from "./RegistryPanel";
import { CopyButton } from "./CopyButton";
import { OnboardingPanel } from "./OnboardingPanel";
import { PrintButton } from "./PrintButton";
import { PrintGraphSummary } from "./PrintGraphSummary";
import { ReadmePreview } from "./ReadmePreview";
import { SectionNav, type SectionItem } from "./SectionNav";
import { ShareButton } from "./ShareButton";
import { BadgeDialog } from "./BadgeDialog";
import { StickyScoreBar } from "./StickyScoreBar";

interface ReviewDashboardProps {
  result: AuditResult;
  onOpenCompare?: () => void;
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

export function ReviewDashboard({ result, onOpenCompare }: ReviewDashboardProps) {
  const securityCategory = result.categories.find((c) => c.key === "security");
  const [badgeOpen, setBadgeOpen] = useState(false);

  // Mobile speed-dial cluster (Phase 2.8.4). The desktop UI surfaces
  // these via the StickyScoreBar; on phones the action surface lives
  // in the bottom-right thumb zone.
  const fabActions: SpeedDialAction[] = [
    {
      id: "share",
      label: "Share",
      icon: ShareIcon,
      onClick: async () => {
        const outcome = await performShare({
          owner: result.bundle.metadata.owner.login,
          repo: result.bundle.metadata.name,
        });
        if (outcome.kind === "copied") {
          pushToast({ tone: "success", message: "Link copied to clipboard" });
        } else if (outcome.kind === "error") {
          pushToast({
            tone: "warn",
            message: "Could not copy the share link",
            detail: "The full URL is in your address bar.",
          });
        }
      },
    },
    {
      id: "badge",
      label: "Badge",
      icon: Award,
      onClick: () => setBadgeOpen(true),
      toneClass: "bg-aurora-mint/15 hover:bg-aurora-mint/25 border-aurora-mint/40 text-aurora-mint",
    },
    {
      id: "print",
      label: "Save as PDF",
      icon: PrinterIcon,
      onClick: () => window.print(),
    },
  ];

  if (onOpenCompare) {
    fabActions.unshift({
      id: "compare",
      label: "Compare",
      icon: ArrowLeftRight,
      onClick: onOpenCompare,
      toneClass: "bg-aurora-cyan/15 hover:bg-aurora-cyan/25 border-aurora-cyan/40 text-aurora-cyan",
    });
  }

  return (
    <div className={`mt-8 space-y-6 ${VIEW_ENTER_CLASS}`}>
      <StickyScoreBar
        result={result}
        onOpenCompare={onOpenCompare}
        onOpenBadge={() => setBadgeOpen(true)}
      />
      <SectionNav sections={SECTIONS} />

      <div className="print-only mb-2 border-b border-slate-200 pb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Astraudit · {result.bundle.metadata.fullName} · generated{" "}
        {new Date(result.generatedAt).toLocaleString()}
      </div>

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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                <Award className="h-3.5 w-3.5 text-aurora-mint" />
                Astraudit verdict
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onOpenCompare ? (
                  <button
                    type="button"
                    onClick={onOpenCompare}
                    className="inline-flex items-center gap-1.5 rounded-full border border-aurora-cyan/40 bg-aurora-cyan/10 px-3 py-1 text-xs font-medium text-aurora-cyan transition hover:bg-aurora-cyan/20 print:hidden"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Compare with…
                  </button>
                ) : null}
                <ShareButton
                  coords={{
                    owner: result.bundle.metadata.owner.login,
                    repo: result.bundle.metadata.name,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setBadgeOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-aurora-mint/40 bg-aurora-mint/10 px-3 py-1 text-xs font-medium text-aurora-mint transition hover:bg-aurora-mint/20 print:hidden"
                >
                  <Award className="h-3.5 w-3.5" />
                  Badge
                </button>
                <CopyButton
                  value={`Astraudit · ${result.bundle.metadata.fullName}\nScore: ${result.totalScore}/${result.maxScore} (${result.grade})\n${result.headline}\n${result.verdict}`}
                  label="Copy verdict"
                  withText
                />
                <PrintButton />
              </div>
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
        <InsightsPanel insights={result.insights} stack={result.stack} />
        <TopicChecks checks={result.insights.topicChecks} />
        <RegistryPanel
          manifest={result.insights.manifest}
          importantFiles={result.bundle.importantFiles}
          repoLicense={result.bundle.metadata.license?.spdxId ?? null}
        />
      </section>

      <section id="graph">
        <AuditGraph graph={result.graph} />
        <PrintGraphSummary graph={result.graph} />
      </section>

      <ScoreBreakdown categories={result.categories} />

      <section id="findings" className="grid gap-6 lg:grid-cols-2">
        <FindingsPanel
          findings={result.findings}
          repoFullName={result.bundle.metadata.fullName}
          score={result.totalScore}
          maxScore={result.maxScore}
          onOpenCompare={onOpenCompare}
        />
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

      <BadgeDialog
        open={badgeOpen}
        onClose={() => setBadgeOpen(false)}
        owner={result.bundle.metadata.owner.login}
        repo={result.bundle.metadata.name}
        score={result.totalScore}
        max={result.maxScore}
        grade={result.grade}
      />

      <SpeedDialFAB actions={fabActions} hidden={badgeOpen} />
    </div>
  );
}
