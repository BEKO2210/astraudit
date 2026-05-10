import {
  Calendar,
  ExternalLink,
  GitBranch,
  GitFork,
  Globe,
  Languages,
  Scale,
  Star,
  Eye,
  CircleDot,
} from "lucide-react";
import type { RepoMetadata } from "../types/github";
import { formatDate, formatRelative } from "../lib/utils/formatDate";
import { formatNumber } from "../lib/utils/formatNumber";
import { safeText } from "../lib/utils/safeText";

interface OverviewHeaderProps {
  metadata: RepoMetadata;
}

export function OverviewHeader({ metadata }: OverviewHeaderProps) {
  return (
    <section className="glass relative overflow-hidden p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <img
            src={metadata.owner.avatarUrl}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            className="h-12 w-12 rounded-xl border border-white/10 bg-ink-800 object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-white">
                {metadata.fullName}
              </h2>
              <a
                href={metadata.htmlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-aurora-cyan"
              >
                Open on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {metadata.archived ? (
                <span className="pill text-risk-medium border-risk-medium/40 bg-risk-medium/10">
                  Archived
                </span>
              ) : null}
              {metadata.fork ? (
                <span className="pill text-risk-info">Fork</span>
              ) : null}
              {metadata.isTemplate ? (
                <span className="pill text-aurora-cyan">Template</span>
              ) : null}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
              {safeText(metadata.description, "No description provided.")}
            </p>
            {metadata.topics.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {metadata.topics.slice(0, 12).map((topic) => (
                  <span key={topic} className="pill text-slate-300">
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <Stat icon={Star} label="Stars" value={formatNumber(metadata.stars)} />
        <Stat icon={GitFork} label="Forks" value={formatNumber(metadata.forks)} />
        <Stat icon={Eye} label="Watchers" value={formatNumber(metadata.watchers)} />
        <Stat
          icon={CircleDot}
          label="Open Issues"
          value={formatNumber(metadata.openIssues)}
        />
        <Stat
          icon={Languages}
          label="Language"
          value={safeText(metadata.language)}
        />
        <Stat
          icon={Scale}
          label="License"
          value={metadata.license?.spdxId ?? metadata.license?.name ?? "None"}
        />
        <Stat
          icon={GitBranch}
          label="Default Branch"
          value={safeText(metadata.defaultBranch)}
        />
        <Stat
          icon={Calendar}
          label="Last Push"
          value={formatRelative(metadata.pushedAt)}
        />
        <Stat
          icon={Calendar}
          label="Created"
          value={formatDate(metadata.createdAt)}
        />
        <Stat
          icon={Globe}
          label="Homepage"
          value={
            metadata.homepage ? (
              <a
                href={metadata.homepage}
                target="_blank"
                rel="noreferrer noopener"
                className="truncate text-aurora-cyan hover:underline"
              >
                {metadata.homepage.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "—"
            )
          }
        />
      </div>
    </section>
  );
}

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}

function Stat({ icon: Icon, label, value }: StatProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-white">{value}</div>
    </div>
  );
}
