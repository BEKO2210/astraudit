import {
  Activity,
  Calendar,
  CircleDot,
  Clock4,
  FileText,
  GitCommitVertical,
  Languages,
  Library,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Telescope,
  Users,
} from "lucide-react";
import type { DerivedInsights } from "../lib/audit/insightEngine";
import { formatNumber } from "../lib/utils/formatNumber";
import { formatRelative } from "../lib/utils/formatDate";

interface InsightsPanelProps {
  insights: DerivedInsights;
}

const FRESHNESS_TONE: Record<DerivedInsights["freshnessBucket"], { color: string; word: string }> = {
  fresh: { color: "text-aurora-mint border-aurora-mint/40 bg-aurora-mint/10", word: "Fresh" },
  recent: { color: "text-aurora-cyan border-aurora-cyan/40 bg-aurora-cyan/10", word: "Recent" },
  stale: { color: "text-risk-medium border-risk-medium/40 bg-risk-medium/10", word: "Stale" },
  abandoned: { color: "text-risk-critical border-risk-critical/40 bg-risk-critical/10", word: "Abandoned" },
  unknown: { color: "text-slate-400 border-white/10 bg-white/5", word: "Unknown" },
};

const TRIAGE_TONE: Record<DerivedInsights["triageHealth"], { color: string; label: string }> = {
  healthy: { color: "text-aurora-mint", label: "Triage looks healthy" },
  moderate: { color: "text-aurora-cyan", label: "Moderate triage queue" },
  backlog: { color: "text-risk-medium", label: "A real backlog has built up" },
  heavy: { color: "text-risk-critical", label: "Triage queue looks heavy" },
  unknown: { color: "text-slate-400", label: "Triage health unclear" },
};

const CADENCE_TONE: Record<DerivedInsights["commits"]["bucket"], string> = {
  burst: "Bursts of multiple commits per day",
  active: "Active — multiple commits per week",
  steady: "Steady weekly cadence",
  occasional: "Occasional — every few weeks",
  rare: "Rare — sometimes months apart",
  unknown: "Cadence not measurable",
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const fresh = FRESHNESS_TONE[insights.freshnessBucket];
  const triage = TRIAGE_TONE[insights.triageHealth];

  return (
    <section className="glass p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Telescope className="h-4 w-4 text-aurora-cyan" />
          <h3 className="text-sm font-semibold text-white">Repository insights</h3>
        </div>
        <span className="hidden text-xs text-slate-500 sm:block">
          Derived signals · {insights.audienceLabel}
        </span>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card
          icon={Calendar}
          label="Project age"
          value={insights.formattedAge}
          accent={
            insights.ageBucket === "veteran" || insights.ageBucket === "mature"
              ? "text-aurora-violet"
              : insights.ageBucket === "newborn"
                ? "text-aurora-amber"
                : "text-aurora-cyan"
          }
          sub={`Bucket: ${insights.ageBucket}`}
        />
        <Card
          icon={Star}
          label="Star momentum"
          value={
            insights.starsPerMonth !== null
              ? `${insights.starsPerMonth.toLocaleString("en-US")} / month`
              : "—"
          }
          sub={`Lifetime average · bucket ${insights.starsBucket}`}
        />
        <Card
          icon={Activity}
          label="Push freshness"
          value={
            insights.daysSincePush !== null
              ? formatRelative(new Date(Date.now() - insights.daysSincePush * 86400000).toISOString())
              : "Unknown"
          }
          sub={fresh.word}
          pillClass={fresh.color}
        />
        <Card
          icon={GitCommitVertical}
          label="Commit cadence"
          value={
            insights.commits.cadenceDays !== null
              ? `${insights.commits.cadenceDays} d apart`
              : "—"
          }
          sub={CADENCE_TONE[insights.commits.bucket]}
        />
        <Card
          icon={Users}
          label="Recent authors"
          value={
            insights.commits.uniqueAuthors > 0
              ? formatNumber(insights.commits.uniqueAuthors)
              : "—"
          }
          sub={
            insights.commits.topAuthors[0]
              ? `Top: ${insights.commits.topAuthors
                  .slice(0, 3)
                  .map((a) => a.name)
                  .join(", ")}`
              : "No author data in window"
          }
        />
        <Card
          icon={Tag}
          label="Release rhythm"
          value={
            insights.releases.count > 0
              ? `${insights.releases.count} tagged · ${insights.releases.rhythm}`
              : "No releases"
          }
          sub={
            insights.releases.averageDaysBetween !== null
              ? `Avg ${insights.releases.averageDaysBetween} days between releases`
              : insights.releases.latestTag
                ? `Latest tag: ${insights.releases.latestTag}`
                : "—"
          }
        />
        <Card
          icon={CircleDot}
          label="Open queue"
          value={`${formatNumber(insights.commits.uniqueAuthors)}`}
          customValue={
            <div>
              <div className="text-base font-semibold text-white">
                {insights.issuePrRatio !== null
                  ? `${insights.issuePrRatio}× more issues than PRs`
                  : "Ratio unavailable"}
              </div>
              <div className={`mt-1 text-[11px] font-medium ${triage.color}`}>
                {triage.label}
              </div>
            </div>
          }
          sub=""
        />
        <Card
          icon={Languages}
          label="Language mix"
          value={`${insights.primaryLanguageShare}% primary`}
          sub={
            insights.diversityBucket === "polyglot"
              ? "Polyglot — at least 3 languages of weight"
              : insights.diversityBucket === "bilingual"
                ? "Bilingual — second language has weight"
                : "Effectively monolingual"
          }
        />
        <Card
          icon={Layers3}
          label="File tree shape"
          value={`${formatNumber(insights.tree.totalFiles)} files`}
          sub={`Depth ~${insights.tree.averageDepth} avg, max ${insights.tree.maxDepth} · ${insights.tree.rootDensity} root`}
        />
        <Card
          icon={Rocket}
          label="CI/CD profile"
          value={
            insights.workflows.total > 0
              ? `${insights.workflows.total} workflows`
              : "No workflows"
          }
          sub={
            insights.workflows.buckets.length
              ? `Covers ${insights.workflows.buckets.join(", ")}`
              : "No build/test/deploy patterns detected"
          }
        />
        <Card
          icon={ShieldCheck}
          label="Trust signal score"
          value={`${insights.trustScore}/100`}
          accent={
            insights.trustScore >= 75
              ? "text-aurora-mint"
              : insights.trustScore >= 50
                ? "text-aurora-cyan"
                : insights.trustScore >= 30
                  ? "text-risk-medium"
                  : "text-risk-critical"
          }
          sub={
            insights.licenseSummary
              ? insights.licenseSummary
              : "No license, security policy, or supply-chain automation detected."
          }
        />
        <Card
          icon={FileText}
          label="README footprint"
          value={
            insights.readme.exists
              ? `${insights.readme.words.toLocaleString("en-US")} words`
              : "No README"
          }
          sub={
            insights.readme.exists
              ? `${insights.readme.headings} headings · ${insights.readme.codeBlocks} code blocks · ${insights.readme.images} images · ${insights.readme.badges} badges`
              : "Visitors land without context."
          }
        />
        {insights.releases.daysSinceLatest !== null ? (
          <Card
            icon={Clock4}
            label="Last release"
            value={`${insights.releases.daysSinceLatest} days ago`}
            sub={insights.releases.latestTag ? `Tag: ${insights.releases.latestTag}` : "—"}
          />
        ) : null}
        {insights.tree.topExtensions.length > 0 ? (
          <Card
            icon={Library}
            label="Top file types"
            value={`${insights.tree.topExtensions[0].ext.toUpperCase()} dominant`}
            sub={insights.tree.topExtensions
              .slice(0, 4)
              .map((e) => `.${e.ext} ${(e.share * 100).toFixed(0)}%`)
              .join(" · ")}
          />
        ) : null}
        {insights.topicSignals.length > 0 ? (
          <Card
            icon={Sparkles}
            label="Topic signals"
            value={insights.topicSignals.join(", ")}
            sub="Inferred from repository topics"
          />
        ) : null}
      </div>
    </section>
  );
}

interface CardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent?: string;
  pillClass?: string;
  customValue?: React.ReactNode;
}

function Card({ icon: Icon, label, value, sub, accent, pillClass, customValue }: CardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition hover:border-white/10 hover:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </div>
      {customValue ? (
        <div className="mt-2 break-words">{customValue}</div>
      ) : (
        <>
          <div
            className={`mt-1.5 break-words text-base font-semibold ${accent ?? "text-white"}`}
          >
            {value}
          </div>
          {pillClass ? (
            <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] ${pillClass}`}>
              {sub}
            </span>
          ) : sub ? (
            <div className="mt-1 break-words text-[11px] leading-relaxed text-slate-400">
              {sub}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
