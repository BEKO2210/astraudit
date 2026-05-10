import {
  Activity,
  Bot,
  Calendar,
  CircleDot,
  ClipboardCheck,
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
  Wrench,
} from "lucide-react";
import type { DerivedInsights, ReadmeMetrics } from "../lib/audit/insightEngine";
import {
  formatInterval,
  summariseByEcosystem,
  type DependabotUpdate,
  type ParsedDependabot,
} from "../lib/audit/dependabotParser";
import {
  ownershipShape,
  type ParsedCodeowners,
} from "../lib/audit/codeownersParser";
import {
  formatChannelKind,
  formatPolicyQuality,
  type ParsedSecurityPolicy,
} from "../lib/audit/securityPolicyParser";
import {
  formatNodeFreshness,
  type ParsedManifest,
} from "../lib/audit/packageManifest";
import {
  formatCadence,
  type ParsedChangelog,
} from "../lib/audit/changelogParser";
import type { StackSignals } from "../types/audit";
import { formatNumber } from "../lib/utils/formatNumber";
import { formatRelative } from "../lib/utils/formatDate";

interface InsightsPanelProps {
  insights: DerivedInsights;
  stack: StackSignals;
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

export function InsightsPanel({ insights, stack }: InsightsPanelProps) {
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
                {insights.openQueueLabel}
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
            insights.workflows.providers.length > 0
              ? insights.workflows.providers
                  .slice(0, 2)
                  .map((p) => p.label)
                  .join(" + ") +
                (insights.workflows.providers.length > 2
                  ? ` + ${insights.workflows.providers.length - 2} more`
                  : "")
              : "No CI detected"
          }
          sub={
            insights.workflows.providers.length === 0
              ? "No pipeline files matched any of the supported providers."
              : insights.workflows.buckets.length
                ? `Covers ${insights.workflows.buckets.join(", ")}${
                    insights.workflows.total > 0
                      ? ` · ${insights.workflows.total} workflow file${insights.workflows.total === 1 ? "" : "s"}`
                      : ""
                  }`
                : "Pipeline files present, but no build/test/deploy keywords matched their names."
          }
        />
        {insights.dependabot && insights.dependabot.updates.length > 0 ? (
          <Card
            icon={Bot}
            label="Dependabot coverage"
            value={buildDependabotValue(insights.dependabot.updates)}
            sub={buildDependabotSub(insights.dependabot)}
          />
        ) : null}
        {insights.codeowners && insights.codeowners.rules.length > 0 ? (
          <Card
            icon={Users}
            label="Code ownership"
            value={buildCodeownersValue(insights.codeowners)}
            sub={buildCodeownersSub(insights.codeowners)}
          />
        ) : null}
        {insights.securityPolicy ? (
          <Card
            icon={ShieldCheck}
            label="Security policy"
            value={buildSecurityPolicyValue(insights.securityPolicy)}
            sub={buildSecurityPolicySub(insights.securityPolicy)}
          />
        ) : null}
        {insights.manifest ? (
          <Card
            icon={Layers3}
            label="Runtime contract"
            value={buildManifestValue(insights.manifest)}
            sub={buildManifestSub(insights.manifest)}
            accent={
              insights.manifest.nodeFreshness === "aging" ||
              insights.manifest.nodeFreshness === "ancient"
                ? "text-risk-medium"
                : insights.manifest.nodeFreshness === "modern"
                  ? "text-aurora-mint"
                  : undefined
            }
          />
        ) : null}
        {insights.changelog ? (
          <Card
            icon={Calendar}
            label="CHANGELOG cadence"
            value={buildChangelogValue(insights.changelog)}
            sub={buildChangelogSub(insights.changelog)}
            accent={
              insights.changelog.cadence === "frequent" ||
              insights.changelog.cadence === "regular"
                ? "text-aurora-mint"
                : insights.changelog.cadence === "dormant"
                  ? "text-risk-medium"
                  : undefined
            }
          />
        ) : null}
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
              ? buildReadmeSub(insights.readme)
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
        {stack.aiDevTools.length > 0 ? (
          <Card
            icon={Bot}
            label="AI / agent tooling"
            value={stack.aiDevTools.slice(0, 3).join(", ") +
              (stack.aiDevTools.length > 3 ? ` + ${stack.aiDevTools.length - 3}` : "")}
            sub="Detected from config files committed to the repository."
            accent="text-aurora-violet"
          />
        ) : null}
        {stack.envManagers.length > 0 ? (
          <Card
            icon={Wrench}
            label="Toolchain pinning"
            value={stack.envManagers.slice(0, 3).join(", ") +
              (stack.envManagers.length > 3 ? ` + ${stack.envManagers.length - 3}` : "")}
            sub="Reproducible local environment via mise / asdf / Nix / Dev Containers etc."
          />
        ) : null}
        {stack.sboms.length > 0 ? (
          <Card
            icon={ClipboardCheck}
            label="Supply chain transparency"
            value={`${stack.sboms.length} SBOM file${stack.sboms.length === 1 ? "" : "s"}`}
            sub={stack.sboms.slice(0, 3).join(", ")}
            accent="text-aurora-mint"
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Format the CHANGELOG card's primary value: cadence label + the
 * mean delta between releases (or "single release" when only one is
 * present). Phase 3.6.
 */
function buildChangelogValue(c: ParsedChangelog): string {
  const cadence = formatCadence(c.cadence);
  if (c.releases.length < 2 || c.averageDaysBetween === null) {
    return `${cadence} · ${c.releases.length} release${c.releases.length === 1 ? "" : "s"}`;
  }
  return `${cadence} · ~${c.averageDaysBetween.toFixed(1)} days between releases`;
}

/**
 * Format the CHANGELOG card's subline: total release count, latest
 * release date + days-since, median delta when applicable, and an
 * Unreleased-section hint. Phase 3.6.
 */
function buildChangelogSub(c: ParsedChangelog): string {
  const parts: string[] = [];
  parts.push(
    `${c.releases.length} dated release${c.releases.length === 1 ? "" : "s"}`,
  );
  if (c.latestDate && c.daysSinceLatest !== null) {
    parts.push(
      c.daysSinceLatest === 0
        ? `latest today (${c.latestDate})`
        : `latest ${c.daysSinceLatest} day${c.daysSinceLatest === 1 ? "" : "s"} ago (${c.latestDate})`,
    );
  }
  if (c.medianDaysBetween !== null) {
    parts.push(`median ${c.medianDaysBetween}d`);
  }
  if (c.hasUnreleasedSection) parts.push("Unreleased section pending");
  return parts.join(" · ");
}

/**
 * Format the runtime-contract card's primary value: Node freshness
 * label + the actual `engines.node` range (or "—" when missing).
 * Phase 3.5.
 */
function buildManifestValue(m: ParsedManifest): string {
  const label = formatNodeFreshness(m.nodeFreshness);
  const range = m.engines.node;
  if (!range) return label;
  return `${label} · node ${range}`;
}

/**
 * Format the runtime-contract card's subline: package-manager pin,
 * module type, peer-dep count + optional split. Phase 3.5.
 */
function buildManifestSub(m: ParsedManifest): string {
  const parts: string[] = [];
  if (m.packageManagerPin) {
    // Strip Corepack's `+sha…` checksum suffix for readability.
    const pin = m.packageManagerPin.replace(/\+sha\d+\..*$/, "");
    parts.push(`packageManager ${pin}`);
  }
  if (m.moduleType) parts.push(`type: ${m.moduleType}`);
  if (m.peerDependencies.length > 0) {
    const required = m.peerDependencies.filter((p) => !p.optional).length;
    const optional = m.peerDependencies.length - required;
    const peerLabel =
      optional > 0
        ? `${m.peerDependencies.length} peer dep${m.peerDependencies.length === 1 ? "" : "s"} (${optional} optional)`
        : `${m.peerDependencies.length} peer dep${m.peerDependencies.length === 1 ? "" : "s"}`;
    parts.push(peerLabel);
  }
  if (parts.length === 0) {
    return m.engines.node
      ? "engines.node declared, no other contract fields set."
      : "No runtime contract declared.";
  }
  return parts.join(" · ");
}

/**
 * Format the SECURITY.md card's primary value: a coarse quality
 * label + the top contact channel kind, e.g. `complete with timeline · Email`.
 * Phase 3.4.
 */
function buildSecurityPolicyValue(p: ParsedSecurityPolicy): string {
  const quality = formatPolicyQuality(p.quality);
  if (p.channels.length === 0) return quality;
  // Surface the most "trusted" channel — coordinated-disclosure
  // services first, then email, then PGP, then a generic URL.
  const order = ["ghsa", "hackerone", "bugcrowd", "openbugbounty", "email", "pgp", "url"] as const;
  const sorted = [...p.channels].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
  );
  return `${quality} · ${formatChannelKind(sorted[0].kind)}`;
}

/**
 * Format the SECURITY.md card's subline: distinct channel count, word
 * count, and a hint about timeline / supported-versions presence.
 * Phase 3.4.
 */
function buildSecurityPolicySub(p: ParsedSecurityPolicy): string {
  const parts: string[] = [];
  parts.push(
    `${p.channels.length} channel${p.channels.length === 1 ? "" : "s"}`,
  );
  parts.push(`${p.words.toLocaleString("en-US")} words`);
  const cues: string[] = [];
  if (p.hasTimeline) cues.push("timeline");
  if (p.mentionsSupportedVersions) cues.push("supported versions");
  if (p.hasVulnTerminology && !p.hasTimeline) cues.push("vulnerability terms");
  if (cues.length) parts.push(cues.join(" + "));
  return parts.join(" · ");
}

/**
 * Format the CODEOWNERS card's primary value: ownership shape +
 * distinct owner count. Phase 3.3.
 */
function buildCodeownersValue(c: ParsedCodeowners): string {
  const shape = ownershipShape(c);
  const shapeLabel: Record<typeof shape, string> = {
    empty: "no rules",
    "single-owner": "single owner",
    narrow: "narrow ownership",
    balanced: "balanced ownership",
    broad: "broad ownership",
  };
  return `${shapeLabel[shape]} · ${c.owners.length} owner${c.owners.length === 1 ? "" : "s"}`;
}

/**
 * Format the CODEOWNERS card's subline: rule count, owner-type mix,
 * coverage %, and a hint when GitLab section headers were skipped.
 * Phase 3.3.
 */
function buildCodeownersSub(c: ParsedCodeowners): string {
  const parts: string[] = [];
  parts.push(
    `${c.rules.length} rule${c.rules.length === 1 ? "" : "s"}`,
  );
  const mix: string[] = [];
  if (c.ownerCounts.team > 0) {
    mix.push(`${c.ownerCounts.team} team${c.ownerCounts.team === 1 ? "" : "s"}`);
  }
  if (c.ownerCounts.user > 0) {
    mix.push(`${c.ownerCounts.user} user${c.ownerCounts.user === 1 ? "" : "s"}`);
  }
  if (c.ownerCounts.email > 0) {
    mix.push(`${c.ownerCounts.email} email${c.ownerCounts.email === 1 ? "" : "s"}`);
  }
  if (mix.length) parts.push(mix.join(" + "));
  if (c.coveragePercent !== null && c.blobsConsidered > 0) {
    parts.push(`covers ~${c.coveragePercent.toFixed(1)}%`);
  }
  if (c.gitlabSectionCount > 0) {
    parts.push(
      `${c.gitlabSectionCount} GitLab section${c.gitlabSectionCount === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ");
}

/**
 * Format the Dependabot card's primary value: top three ecosystems
 * with cadence, e.g. `npm · weekly  ·  github-actions · weekly`. Phase 3.2.
 */
function buildDependabotValue(updates: DependabotUpdate[]): string {
  const eco = summariseByEcosystem(updates);
  const top = eco.slice(0, 3);
  return top
    .map((s) => {
      const interval =
        s.intervals.length === 1
          ? formatInterval(s.intervals[0]).toLowerCase()
          : "mixed cadence";
      return `${s.ecosystem} · ${interval}`;
    })
    .join("  ·  ");
}

/**
 * Format the Dependabot card's subline: total update count + group
 * count + registry count + extra-ecosystem hint when more than three
 * ecosystems are watched. Phase 3.2.
 */
function buildDependabotSub(dep: ParsedDependabot): string {
  const eco = summariseByEcosystem(dep.updates);
  const totalGroups = eco.reduce((sum, s) => sum + s.totalGroupCount, 0);
  const moreNote =
    eco.length > 3 ? ` · + ${eco.length - 3} more ecosystem${eco.length - 3 === 1 ? "" : "s"}` : "";
  const groupNote = totalGroups > 0 ? ` · ${totalGroups} group rule${totalGroups === 1 ? "" : "s"}` : "";
  const registryNote =
    dep.registryCount > 0
      ? ` · ${dep.registryCount} private registr${dep.registryCount === 1 ? "y" : "ies"}`
      : "";
  return `${dep.updates.length} update entr${dep.updates.length === 1 ? "y" : "ies"}${moreNote}${groupNote}${registryNote}`;
}

/**
 * Format the README footprint subline. Includes the Flesch-Kincaid
 * grade level + bucket label when we have enough prose to compute one;
 * otherwise falls back to the structural counts so very short READMEs
 * still get useful context. Phase 3.1.
 */
function buildReadmeSub(readme: ReadmeMetrics): string {
  const structural = `${readme.headings} headings · ${readme.codeBlocks} code blocks · ${readme.images} images · ${readme.badges} badges`;
  const r = readme.readability;
  if (!r) return structural;
  const bucketLabel: Record<typeof r.bucket, string> = {
    elementary: "elementary reading level",
    easy: "easy reading level",
    standard: "standard reading level",
    dense: "dense reading level",
    academic: "academic reading level",
  };
  return `${structural} · grade ${r.fleschKincaidGrade.toFixed(1)} · ${bucketLabel[r.bucket]}`;
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
