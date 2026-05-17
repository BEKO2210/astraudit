import { Activity, GitCommit, GitPullRequest, Tag } from "lucide-react";
import type { RepoBundle } from "../types/github";
import { formatDate, formatRelative } from "../lib/utils/formatDate";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { CopyButton } from "./CopyButton";
import { useTranslation } from "../lib/i18n";

interface MaintenancePanelProps {
  bundle: RepoBundle;
}

export function MaintenancePanel({ bundle }: MaintenancePanelProps) {
  const { t } = useTranslation();
  return (
    <section className="glass p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-aurora-cyan" />
        <h3 className="text-sm font-semibold text-white">{t("panel.maintenance")}</h3>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card title="Last push" value={formatRelative(bundle.metadata.pushedAt)} sub={formatDate(bundle.metadata.pushedAt)} />
        <Card
          title="Releases"
          value={String(bundle.releases.length)}
          sub={
            bundle.releases[0]?.tagName
              ? `Latest: ${bundle.releases[0].tagName}`
              : "No releases detected"
          }
        />
        <Card
          title="Open issues"
          value={String(bundle.issues.openIssueCount)}
          sub={
            bundle.issues.openPRCount !== null
              ? `Open PRs: ${bundle.issues.openPRCount}`
              : "PR count unavailable"
          }
        />
      </div>

      <div className="mt-5">
        <ActivityHeatmap commits={bundle.recentCommits} />
      </div>

      {bundle.recentCommits.length > 0 ? (
        <div className="mt-5">
          <h4 className="card-title">Recent commits</h4>
          <ul className="mt-2 space-y-1.5">
            {bundle.recentCommits.slice(0, 6).map((c) => (
              <li
                key={c.sha}
                className="flex items-start gap-2 overflow-hidden rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs text-slate-300"
              >
                <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-slate-200">{c.message}</p>
                  <p className="text-[11px] text-slate-500">
                    <code className="font-mono">{c.sha.slice(0, 7)}</code> ·{" "}
                    {c.authorName ?? "Unknown"} · {formatRelative(c.authorDate)}
                  </p>
                </div>
                <CopyButton value={c.sha} label="Copy commit SHA" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {bundle.releases.length > 0 ? (
        <div className="mt-5">
          <h4 className="card-title">Releases</h4>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {bundle.releases.slice(0, 6).map((r) => (
              <li
                key={r.tagName + (r.publishedAt ?? "")}
                className="flex items-center gap-2 overflow-hidden rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs"
              >
                <Tag className="h-3.5 w-3.5 shrink-0 text-aurora-violet" />
                <span className="min-w-0 flex-1 truncate text-slate-200">
                  {r.name ?? r.tagName}
                </span>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {formatRelative(r.publishedAt)}
                </span>
                <CopyButton value={r.tagName} label="Copy tag" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {bundle.issues.openPRCount !== null ? (
        <p className="mt-3 text-xs text-slate-500 inline-flex items-center gap-1.5">
          <GitPullRequest className="h-3 w-3" />
          PR count via the GitHub search API.
        </p>
      ) : null}
    </section>
  );
}

interface CardProps {
  title: string;
  value: string;
  sub: string;
}

function Card({ title, value, sub }: CardProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
