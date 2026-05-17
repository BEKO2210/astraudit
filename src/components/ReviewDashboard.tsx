import {
  ArrowLeftRight,
  Award,
  Printer as PrinterIcon,
  RefreshCw,
  Share2 as ShareIcon,
  Sparkles,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "../lib/i18n";
import { AuditGraphSkeleton } from "./AuditGraphSkeleton";
import { formatRelativeTime } from "../lib/utils/formatDate";
import {
  applySimpleMode,
  loadSimpleMode,
  setSimpleMode,
  subscribeSimpleMode,
  type SimpleMode,
} from "../lib/ui/simpleModeStore";
import { SimpleAuditView } from "./SimpleAuditView";
import { performShare } from "../lib/share/shareAction";
import { pushToast } from "../lib/ui/toastStore";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";
import { SpeedDialFAB, type SpeedDialAction } from "./SpeedDialFAB";
import type { AuditResult } from "../types/audit";
import { OverviewHeader } from "./OverviewHeader";
import { ScoreRing } from "./ScoreRing";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SignalDetails } from "./SignalDetails";
import { Tooltip } from "./ui/Tooltip";
import { getStats as getHistoryStats } from "../lib/history/historyStore";
import { RepoStory } from "./RepoStory";
import { FindingsPanel } from "./FindingsPanel";
// Phase 4.4 — lazy-load AuditGraph so React Flow + its CSS only ship
// after the dashboard has painted. The graph is below the fold on
// most viewports, so the user typically never notices the second
// fetch — and on narrower viewports we render the skeleton fallback
// while the chunk arrives.
const AuditGraph = lazy(() => import("./AuditGraph"));
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
import { ExportMenu } from "./ExportMenu";
import { PrintGraphSummary } from "./PrintGraphSummary";
import { ReadmePreview } from "./ReadmePreview";
import { SectionNav, type SectionItem } from "./SectionNav";
import { ShareButton } from "./ShareButton";
// Phase 6.16 — BadgeDialog only mounts on user demand (Award button /
// FAB / "Get badge" CTA). Lazy-loading saves ~9 KB on first paint.
const BadgeDialog = lazy(() =>
  import("./BadgeDialog").then((m) => ({ default: m.BadgeDialog })),
);
import { StickyScoreBar } from "./StickyScoreBar";

interface ReviewDashboardProps {
  result: AuditResult;
  onOpenCompare?: () => void;
  /**
   * Roadmap M4.1 — opens the StackMatesDialog. Optional so renders
   * without a host (storybook, tests) still mount cleanly.
   */
  onOpenStackMates?: () => void;
  /**
   * Re-audit handler — drops the cached bundle for this repo and
   * re-fetches everything. Wired in App.tsx via `forceFresh: true`.
   * Optional so test renders + storybook still work without a host.
   */
  onReaudit?: () => void;
}

const SECTIONS: SectionItem[] = [
  { id: "overview", label: "Overview" },
  { id: "score", label: "Score" },
  { id: "signals", label: "Signals" },
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

export function ReviewDashboard({
  result,
  onOpenCompare,
  onOpenStackMates,
  onReaudit,
}: ReviewDashboardProps) {
  const { t } = useTranslation();
  const securityCategory = result.categories.find((c) => c.key === "security");
  const [badgeOpen, setBadgeOpen] = useState(false);

  // Simple-mode toggle. Read once on mount, then subscribe so a
  // change pushed via setSimpleMode (e.g. from the toggle button or
  // a CommandPalette entry) propagates without remounting the
  // dashboard.
  const [simpleMode, setSimpleModeState] = useState<SimpleMode>(() =>
    loadSimpleMode(),
  );
  useEffect(() => {
    applySimpleMode(simpleMode);
  }, [simpleMode]);
  useEffect(() => {
    return subscribeSimpleMode((value) => setSimpleModeState(value));
  }, []);
  const flipSimpleMode = () => {
    const next: SimpleMode = simpleMode === "on" ? "off" : "on";
    setSimpleMode(next);
  };

  // Re-render every 30 s so the "Generated …" chip ages in place —
  // a tab left open for a few minutes should read "Generated 2
  // minutes ago", not stay frozen on "just now". One cheap timer,
  // formatting ~4 chars of text; mirrors the ErrorState pattern.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (simpleMode === "on") {
    return (
      <SimpleAuditView
        result={result}
        onShowFullAudit={() => setSimpleMode("off")}
        onReaudit={onReaudit}
      />
    );
  }

  // Comparison needs a second repo to diff against. Until the local
  // history holds at least two repos there's nothing to compare, so
  // the "Compare with…" button stays visible but disabled with a
  // tooltip explaining how to unlock it. The current repo is already
  // recorded by the time the dashboard paints, so `total >= 2` means
  // "at least one other repo exists".
  const canCompare = getHistoryStats().total >= 2;

  // Mobile speed-dial cluster (Phase 2.8.4). The desktop UI surfaces
  // these via the StickyScoreBar; on phones the action surface lives
  // in the bottom-right thumb zone.
  const fabActions: SpeedDialAction[] = [
    {
      id: "share",
      label: t("dashboard.fab.share"),
      icon: ShareIcon,
      onClick: async () => {
        const outcome = await performShare({
          owner: result.bundle.metadata.owner.login,
          repo: result.bundle.metadata.name,
        });
        if (outcome.kind === "copied") {
          pushToast({ tone: "success", message: t("toast.share.copied") });
        } else if (outcome.kind === "error") {
          pushToast({
            tone: "warn",
            message: t("toast.share.error"),
            detail: t("toast.share.errorDetail"),
          });
        }
      },
    },
    {
      id: "badge",
      label: t("dashboard.actions.badge"),
      icon: Award,
      onClick: () => setBadgeOpen(true),
      toneClass: "bg-aurora-mint/15 hover:bg-aurora-mint/25 border-aurora-mint/40 text-aurora-mint",
    },
    {
      id: "print",
      label: t("dashboard.fab.print"),
      icon: PrinterIcon,
      onClick: () => window.print(),
    },
  ];

  if (onOpenCompare) {
    fabActions.unshift({
      id: "compare",
      label: t("dashboard.fab.compare"),
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
        canCompare={canCompare}
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
                {t("dashboard.verdictBadge")}
              </div>
              {/* Phase 5.x bugfix — `justify-end` so wrapped action
                  rows right-align too. Without it, the second-row
                  buttons (Copy verdict / Export / Print on a narrow
                  viewport) flowed flush-left at the start of the
                  right-aligned block — visually disconnected from
                  the first row. The user-reported "copy ist zu weit
                  links" came from this mis-wrap. */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* Roadmap M4.1 — discovers up to 5 stack-mates via
                    GitHub Search and lets the user audit them
                    individually. Sits beside "Compare with…" because
                    both answer the same review-time question: "what
                    else should I look at?". */}
                {onOpenStackMates ? (
                  <button
                    type="button"
                    onClick={onOpenStackMates}
                    className="inline-flex items-center gap-1.5 rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-3 py-1 text-xs font-medium text-aurora-violet transition hover:bg-aurora-violet/20 print:hidden"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("dashboard.actions.similar")}
                  </button>
                ) : null}
                {onOpenCompare ? (
                  canCompare ? (
                    <button
                      type="button"
                      onClick={onOpenCompare}
                      className="inline-flex items-center gap-1.5 rounded-full border border-aurora-cyan/40 bg-aurora-cyan/10 px-3 py-1 text-xs font-medium text-aurora-cyan transition hover:bg-aurora-cyan/20 print:hidden"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      {t("dashboard.actions.compare")}
                    </button>
                  ) : (
                    <Tooltip
                      label={t("dashboard.actions.compareDisabledTip")}
                      placement="bottom"
                      describe
                    >
                      <button
                        type="button"
                        aria-disabled="true"
                        onClick={(e) => e.preventDefault()}
                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-500 print:hidden"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        {t("dashboard.actions.compare")}
                      </button>
                    </Tooltip>
                  )
                ) : null}
                {onReaudit ? (
                  <button
                    type="button"
                    onClick={onReaudit}
                    title={t("dashboard.actions.reauditTitle")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-3 py-1 text-xs font-medium text-aurora-violet transition hover:bg-aurora-violet/20 print:hidden"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("dashboard.actions.reaudit")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={flipSimpleMode}
                  aria-pressed={false}
                  title={t("dashboard.actions.simpleModeTitle")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white print:hidden"
                >
                  {t("dashboard.actions.simpleMode")}
                </button>
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
                  {t("dashboard.actions.badge")}
                </button>
                <CopyButton
                  value={`Astraudit · ${result.bundle.metadata.fullName}\nScore: ${result.totalScore}/${result.maxScore} (${result.grade})\n${result.headline}\n${result.verdict}`}
                  label={t("dashboard.actions.copyVerdict")}
                  withText
                />
                <ExportMenu result={result} />
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
              {t("dashboard.meta.generated")}{" "}
              <time
                dateTime={result.generatedAt}
                title={new Date(result.generatedAt).toLocaleString()}
              >
                {formatRelativeTime(result.generatedAt, now)}
              </time>{" "}
              · {t("dashboard.meta.findingsLabel")}: {result.findings.length} ·{" "}
              {t("dashboard.meta.recommendationsLabel")}:{" "}
              {result.recommendations.length}
              {onReaudit ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={onReaudit}
                    className="inline-flex items-center gap-1 rounded text-aurora-violet underline-offset-2 transition hover:underline focus-visible:underline focus-visible:outline-none print:hidden"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-audit now
                  </button>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <section id="signals">
        <SignalDetails categories={result.categories} />
      </section>

      <section id="story">
        <RepoStory story={result.story} />
      </section>

      {/* The README section always renders so the section nav anchor
          is never dead — <ReadmePreview /> shows a friendly
          "no README" message when the repo doesn't ship one. */}
      <section id="readme">
        <ReadmePreview
          content={result.bundle.readme?.content ?? ""}
          owner={result.bundle.metadata.owner.login}
          repo={result.bundle.metadata.name}
          branch={result.bundle.metadata.defaultBranch}
          htmlUrl={result.bundle.metadata.htmlUrl}
        />
      </section>

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
        <Suspense fallback={<AuditGraphSkeleton />}>
          <AuditGraph graph={result.graph} />
        </Suspense>
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
          coords={{
            owner: result.bundle.metadata.owner.login,
            repo: result.bundle.metadata.name,
          }}
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

      {badgeOpen ? (
        <Suspense fallback={null}>
          <BadgeDialog
            open={badgeOpen}
            onClose={() => setBadgeOpen(false)}
            owner={result.bundle.metadata.owner.login}
            repo={result.bundle.metadata.name}
            score={result.totalScore}
            max={result.maxScore}
            grade={result.grade}
          />
        </Suspense>
      ) : null}

      <SpeedDialFAB actions={fabActions} hidden={badgeOpen} />
    </div>
  );
}
