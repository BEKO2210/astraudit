/**
 * <TopicChecks /> — surfaces the Phase 3.7 topic-driven rules.
 *
 * Each check is a small row showing the trigger topic, the check
 * title, a status pill, the evidence we gathered, and the hint when
 * the rule is missing or only partially satisfied.
 */

import { CheckCircle2, CircleAlert, CircleSlash, Sparkles } from "lucide-react";
import {
  formatCheckStatus,
  summariseTopicChecks,
  type CheckStatus,
  type TopicCheck,
} from "../lib/audit/topicRules";

interface Props {
  checks: TopicCheck[];
}

const STATUS_COLOR: Record<CheckStatus, string> = {
  met: "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint",
  partial: "border-aurora-amber/40 bg-aurora-amber/10 text-aurora-amber",
  missing: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  "not-applicable": "border-white/10 bg-white/[0.03] text-slate-400",
};

const STATUS_ICON: Record<
  CheckStatus,
  React.ComponentType<{ className?: string }>
> = {
  met: CheckCircle2,
  partial: CircleAlert,
  missing: CircleSlash,
  "not-applicable": CircleSlash,
};

export function TopicChecks({ checks }: Props) {
  if (checks.length === 0) return null;
  const summary = summariseTopicChecks(checks);

  return (
    <section
      id="topic-checks"
      aria-label="Topic-driven contextual checks"
      className="glass mt-6 p-5 sm:p-6"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-aurora-violet" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Topic alignment
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">
          {summary.met}/{summary.total} met
          {summary.partial > 0 ? ` · ${summary.partial} partial` : ""}
          {summary.missing > 0 ? ` · ${summary.missing} missing` : ""}
        </span>
      </header>
      <p className="mt-1 text-xs text-slate-500">
        Each rule fires from a GitHub topic on the repo and verifies a
        contract that topic conventionally implies (e.g. <code>cli</code>
        → expect a <code>bin</code> entry).
      </p>

      <ul className="mt-4 space-y-3">
        {checks.map((c) => {
          const Icon = STATUS_ICON[c.status];
          return (
            <li
              key={c.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              data-print-card
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono uppercase tracking-wider text-slate-300">
                      {c.topic}
                    </span>
                  </div>
                  <h3 className="mt-1.5 break-words text-sm font-medium text-white">
                    {c.title}
                  </h3>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_COLOR[c.status]}`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {formatCheckStatus(c.status)}
                </span>
              </div>
              {c.evidence.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {c.evidence.map((e, i) => (
                    <li key={i}>· {e}</li>
                  ))}
                </ul>
              ) : null}
              {c.hint ? (
                <p className="mt-2 rounded-md border border-white/5 bg-white/[0.02] p-2 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-300">Hint: </span>
                  {c.hint}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
