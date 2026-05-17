import {
  ArrowLeftRight,
  Check,
  ExternalLink,
  Minus,
  Printer as PrinterIcon,
  RotateCcw,
  Share2 as ShareIcon,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import type { CompareResult } from "../lib/compare/diff";
import { performShare } from "../lib/share/shareAction";
import { pushToast } from "../lib/ui/toastStore";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";
import { useTranslation } from "../lib/i18n";
import { CopyButton } from "./CopyButton";
import { ShareButton } from "./ShareButton";
import { SpeedDialFAB, type SpeedDialAction } from "./SpeedDialFAB";
import { ScoreRing } from "./ScoreRing";
import { severityClass, severityLabel } from "../lib/utils/severity";

interface CompareDashboardProps {
  compare: CompareResult;
  onReset: () => void;
  onOpenCompare: () => void;
}

export function CompareDashboard({
  compare,
  onReset,
  onOpenCompare,
}: CompareDashboardProps) {
  const { left, right, summary, categories, findings, stack } = compare;

  const fabActions: SpeedDialAction[] = [
    {
      id: "compare",
      label: "Change opponent",
      icon: ArrowLeftRight,
      onClick: onOpenCompare,
      toneClass:
        "bg-aurora-cyan/15 hover:bg-aurora-cyan/25 border-aurora-cyan/40 text-aurora-cyan",
    },
    {
      id: "share",
      label: "Share",
      icon: ShareIcon,
      onClick: async () => {
        const outcome = await performShare({
          owner: left.bundle.metadata.owner.login,
          repo: left.bundle.metadata.name,
        });
        if (outcome.kind === "copied") {
          pushToast({ tone: "success", message: "Link copied to clipboard" });
        } else if (outcome.kind === "error") {
          pushToast({
            tone: "warn",
            message: "Could not copy the share link",
          });
        }
      },
    },
    {
      id: "print",
      label: "Save as PDF",
      icon: PrinterIcon,
      onClick: () => window.print(),
    },
    {
      id: "reset",
      label: "Exit compare",
      icon: RotateCcw,
      onClick: onReset,
    },
  ];

  return (
    <div className={`mt-8 space-y-6 ${VIEW_ENTER_CLASS}`}>
      <CompareHeader
        compare={compare}
        onReset={onReset}
        onOpenCompare={onOpenCompare}
      />

      <CompareScores compare={compare} />

      <CompareCategories items={categories} leftFullName={left.bundle.metadata.fullName} rightFullName={right.bundle.metadata.fullName} />

      <CompareFindings findings={findings} leftFullName={left.bundle.metadata.fullName} rightFullName={right.bundle.metadata.fullName} />

      <CompareStack stack={stack} leftFullName={left.bundle.metadata.fullName} rightFullName={right.bundle.metadata.fullName} />

      <CompareSummary compare={compare} />

      <p className="text-center text-[11px] text-slate-600">
        Compare summary built from {summary.catWins.left + summary.catWins.right + summary.catWins.tie} categories ·{" "}
        {findings.shared.length} shared findings · {findings.onlyInLeft.length + findings.onlyInRight.length} unique findings.
      </p>

      <SpeedDialFAB actions={fabActions} ariaLabel="Compare actions" />
    </div>
  );
}

function CompareHeader({
  compare,
  onReset,
  onOpenCompare,
}: {
  compare: CompareResult;
  onReset: () => void;
  onOpenCompare: () => void;
}) {
  const { t } = useTranslation();
  const { left, right } = compare;
  const summaryText = `Compare · ${left.bundle.metadata.fullName} (${left.totalScore}) vs ${right.bundle.metadata.fullName} (${right.totalScore})`;
  return (
    <section className="glass relative overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <ArrowLeftRight className="h-4 w-4 text-aurora-cyan" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Side-by-side comparison
            </p>
            <h2 className="mt-0.5 break-words text-base font-semibold text-white sm:text-lg">
              <span className="text-aurora-cyan">{left.bundle.metadata.fullName}</span>
              <span className="text-slate-500"> vs </span>
              <span className="text-aurora-violet">{right.bundle.metadata.fullName}</span>
            </h2>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <ShareButton
            coords={{
              owner: left.bundle.metadata.owner.login,
              repo: left.bundle.metadata.name,
            }}
          />
          <CopyButton value={summaryText} label={t("compareDashboard.copySummary")} withText />
          <button
            type="button"
            onClick={onOpenCompare}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Change opponent
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RepoTag side="left" repo={left.bundle.metadata.fullName} url={left.bundle.metadata.htmlUrl} />
        <RepoTag side="right" repo={right.bundle.metadata.fullName} url={right.bundle.metadata.htmlUrl} />
      </div>
    </section>
  );
}

function RepoTag({
  side,
  repo,
  url,
}: {
  side: "left" | "right";
  repo: string;
  url: string;
}) {
  const accent = side === "left" ? "border-aurora-cyan/40 bg-aurora-cyan/5" : "border-aurora-violet/40 bg-aurora-violet/5";
  const tone = side === "left" ? "text-aurora-cyan" : "text-aurora-violet";
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={`flex items-center justify-between gap-2 overflow-hidden rounded-xl border ${accent} px-3 py-2 transition hover:bg-white/[0.04]`}
    >
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-[0.16em] ${tone}`}>
          {side === "left" ? "Left" : "Right"}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-white">{repo}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  );
}

function CompareScores({ compare }: { compare: CompareResult }) {
  const { left, right, summary } = compare;
  return (
    <section className="glass p-5 sm:p-6">
      <div className="grid items-center gap-6 lg:grid-cols-3">
        <div className="flex flex-col items-center">
          <ScoreRing score={left.totalScore} max={left.maxScore} grade={left.grade} />
          <p className="mt-3 text-center text-xs text-slate-400">{left.bundle.metadata.fullName}</p>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Score delta (left − right)
          </p>
          <p
            className={`mt-1 text-4xl font-semibold sm:text-5xl ${
              summary.winner === "left"
                ? "text-aurora-mint"
                : summary.winner === "right"
                  ? "text-risk-medium"
                  : "text-slate-300"
            }`}
          >
            {summary.totalDeltaLabel}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {summary.winner === "tie"
              ? "Even total score."
              : `${
                  summary.winner === "left"
                    ? left.bundle.metadata.fullName
                    : right.bundle.metadata.fullName
                } wins ${summary.catWins[summary.winner]} of ${categoriesCount(compare)} categories.`}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Trophy className="h-3.5 w-3.5 text-aurora-mint" />
            Left wins: {summary.catWins.left} · Right wins: {summary.catWins.right} · Ties: {summary.catWins.tie}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <ScoreRing score={right.totalScore} max={right.maxScore} grade={right.grade} />
          <p className="mt-3 text-center text-xs text-slate-400">{right.bundle.metadata.fullName}</p>
        </div>
      </div>
    </section>
  );
}

function categoriesCount(compare: CompareResult): number {
  return compare.categories.length;
}

function CompareCategories({
  items,
  leftFullName,
  rightFullName,
}: {
  items: CompareResult["categories"];
  leftFullName: string;
  rightFullName: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="glass p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-white">{t("compareDashboard.perCategoryScore")}</h3>
      <p className="mt-1 text-xs text-slate-500">
        Bars show the share of each category's max points scored by{" "}
        <span className="text-aurora-cyan">{leftFullName}</span> vs{" "}
        <span className="text-aurora-violet">{rightFullName}</span>.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((c) => {
          const leftPct = Math.round((c.left / c.max) * 100);
          const rightPct = Math.round((c.right / c.max) * 100);
          return (
            <div key={c.key} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-200">{c.label}</span>
                <span
                  className={`font-mono ${
                    c.winner === "left"
                      ? "text-aurora-mint"
                      : c.winner === "right"
                        ? "text-risk-medium"
                        : "text-slate-400"
                  }`}
                >
                  {c.left}/{c.max} vs {c.right}/{c.max} · Δ {c.deltaLabel}
                </span>
              </div>
              <div className="mt-2 grid gap-1.5">
                <Bar
                  side="left"
                  pct={leftPct}
                  label={`${c.left}/${c.max}`}
                />
                <Bar
                  side="right"
                  pct={rightPct}
                  label={`${c.right}/${c.max}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Bar({ side, pct, label }: { side: "left" | "right"; pct: number; label: string }) {
  const tone =
    side === "left"
      ? "bg-gradient-to-r from-aurora-cyan/80 to-aurora-blue/60"
      : "bg-gradient-to-r from-aurora-violet/80 to-aurora-blue/60";
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {side === "left" ? "L" : "R"}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-[11px] text-slate-400">
        {label}
      </span>
    </div>
  );
}

function CompareFindings({
  findings,
  leftFullName,
  rightFullName,
}: {
  findings: CompareResult["findings"];
  leftFullName: string;
  rightFullName: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-aurora-violet" />
        <h3 className="text-sm font-semibold text-white">{t("compareDashboard.findingsDiff")}</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Findings are matched by category + title. Severity differences inside
        the shared bucket are highlighted.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <FindingsColumn
          title={`Only in ${leftFullName}`}
          tone="cyan"
          items={findings.onlyInLeft.map((f) => ({ key: f.id, top: f, bottom: null }))}
        />
        <FindingsColumn
          title={t("compareDashboard.shared")}
          tone="violet"
          items={findings.shared.map((p) => ({
            key: p.left.id,
            top: p.left,
            bottom: p.right,
            same: p.same,
          }))}
        />
        <FindingsColumn
          title={`Only in ${rightFullName}`}
          tone="amber"
          items={findings.onlyInRight.map((f) => ({ key: f.id, top: f, bottom: null }))}
        />
      </div>
    </section>
  );
}

interface FindingsColumnItem {
  key: string;
  top: import("../types/finding").Finding;
  bottom: import("../types/finding").Finding | null;
  same?: boolean;
}

function FindingsColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "cyan" | "violet" | "amber";
  items: FindingsColumnItem[];
}) {
  const { t } = useTranslation();
  const accent: Record<typeof tone, string> = {
    cyan: "border-aurora-cyan/40 text-aurora-cyan",
    violet: "border-aurora-violet/40 text-aurora-violet",
    amber: "border-aurora-amber/40 text-aurora-amber",
  };
  return (
    <div className={`overflow-hidden rounded-xl border ${accent[tone]} bg-white/[0.02] p-3`}>
      <h4 className={`break-words text-xs font-semibold uppercase tracking-[0.16em] ${accent[tone].split(" ")[1]}`}>
        {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{t("compareDashboard.noneShort")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs"
            >
              <p className="break-words font-medium text-slate-200">{item.top.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className={`pill border ${severityClass(item.top.severity)}`}>
                  {severityLabel(item.top.severity)}
                </span>
                {item.bottom ? (
                  <>
                    <span className="text-slate-500">vs</span>
                    <span className={`pill border ${severityClass(item.bottom.severity)}`}>
                      {severityLabel(item.bottom.severity)}
                    </span>
                    {item.same === false ? (
                      <span className="pill text-risk-medium border-risk-medium/40 bg-risk-medium/10">
                        severity differs
                      </span>
                    ) : (
                      <span className="pill text-aurora-mint border-aurora-mint/30 bg-aurora-mint/10">
                        identical
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompareStack({
  stack,
  leftFullName,
  rightFullName,
}: {
  stack: CompareResult["stack"];
  leftFullName: string;
  rightFullName: string;
}) {
  const sections = [
    stack.frameworks,
    stack.buildTools,
    stack.testTools,
    stack.lintTools,
    stack.envManagers,
    stack.pythonTools,
    stack.aiDevTools,
  ];
  const { t } = useTranslation();
  return (
    <section className="glass p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-white">{t("compareDashboard.stackDiff")}</h3>
      <p className="mt-1 text-xs text-slate-500">
        Tools detected on each side.{" "}
        <span className="text-aurora-cyan">{leftFullName}</span> only ·{" "}
        <span className="text-aurora-mint">shared</span> ·{" "}
        <span className="text-aurora-violet">{rightFullName}</span> only.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {stack.scalarFacts.map((s) => (
              <tr key={s.label} className="text-slate-300">
                <td className="border-b border-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {s.label}
                </td>
                <td className="border-b border-white/5 px-3 py-1.5 text-aurora-cyan">{s.left}</td>
                <td className="border-b border-white/5 px-3 py-1.5 text-aurora-violet">{s.right}</td>
                <td className="border-b border-white/5 px-3 py-1.5 text-right text-xs text-slate-500">
                  {s.same ? <Check className="ml-auto inline h-3.5 w-3.5 text-aurora-mint" /> : <Minus className="ml-auto inline h-3.5 w-3.5" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          if (
            s.onlyInLeft.length === 0 &&
            s.onlyInRight.length === 0 &&
            s.shared.length === 0
          )
            return null;
          return (
            <div key={s.label} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {s.label}
              </h4>
              {s.shared.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-aurora-mint">{t("compareDashboard.shared")}</p>
                  <p className="mt-0.5 break-words text-xs text-slate-300">{s.shared.join(", ")}</p>
                </div>
              ) : null}
              {s.onlyInLeft.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-aurora-cyan">{t("compareDashboard.onlyInLeft")}</p>
                  <p className="mt-0.5 break-words text-xs text-slate-300">{s.onlyInLeft.join(", ")}</p>
                </div>
              ) : null}
              {s.onlyInRight.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-aurora-violet">{t("compareDashboard.onlyInRight")}</p>
                  <p className="mt-0.5 break-words text-xs text-slate-300">{s.onlyInRight.join(", ")}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CompareSummary({ compare }: { compare: CompareResult }) {
  const { left, right, summary } = compare;
  const { t } = useTranslation();
  return (
    <section className="glass p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-white">{t("compareDashboard.quickVerdict")}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-200/95">
        {summary.winner === "tie" ? (
          <>
            Both repositories tie at <strong>{left.totalScore}/100</strong>. They
            score the same overall but split categories{" "}
            <span className="text-aurora-cyan">L {summary.catWins.left}</span>{" "}
            ·{" "}
            <span className="text-aurora-violet">R {summary.catWins.right}</span>{" "}
            (ties: {summary.catWins.tie}).
          </>
        ) : summary.winner === "left" ? (
          <>
            <span className="text-aurora-cyan">{left.bundle.metadata.fullName}</span>{" "}
            scores higher overall ({left.totalScore} vs {right.totalScore}, Δ{" "}
            {summary.totalDeltaLabel}) and wins{" "}
            <strong>
              {summary.catWins.left}/{categoriesCount(compare)}
            </strong>{" "}
            categories.
          </>
        ) : (
          <>
            <span className="text-aurora-violet">{right.bundle.metadata.fullName}</span>{" "}
            scores higher overall ({right.totalScore} vs {left.totalScore}, Δ{" "}
            {summary.totalDeltaLabel}) and wins{" "}
            <strong>
              {summary.catWins.right}/{categoriesCount(compare)}
            </strong>{" "}
            categories.
          </>
        )}
      </p>
    </section>
  );
}
