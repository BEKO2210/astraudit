/**
 * Phase 5.6 — single error-state surface.
 *
 * Replaces the old "title + message + one hard-coded CTA" component
 * with a renderer driven by `AuditErrorView` (see
 * `src/lib/github/auditErrorView.ts`). The view object encodes the
 * error's *kind* (rate-limit / 404 / network / …) which we use to
 * pick the right icon, an optional rate-limit countdown, and a
 * variable-length CTA cluster (so a rate-limit can show *both*
 * "Open Settings" and "Retry" instead of just "try a different
 * repository", which was wrong for half the error kinds).
 */
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Cog,
  KeyRound,
  RefreshCw,
  Search,
  WifiOff,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";
import {
  formatResetCountdown,
  type AuditErrorAction,
  type AuditErrorView,
} from "../lib/github/auditErrorView";

interface ErrorStateProps {
  view: AuditErrorView;
  onReset?: () => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  onDismiss?: () => void;
}

const ICONS: Record<AuditErrorView["kind"], LucideIcon> = {
  "rate-limit": Clock,
  "rate-limit-anon": Clock,
  "not-found": Search,
  "too-large": AlertTriangle,
  // Phase 7.x — 401-specific. The Key icon makes the credential
  // angle obvious without reading the title.
  "invalid-token": KeyRound,
  github: AlertTriangle,
  network: WifiOff,
  empty: Search,
  abort: X,
  unknown: AlertTriangle,
};

export function ErrorState({
  view,
  onReset,
  onRetry,
  onOpenSettings,
  onDismiss,
}: ErrorStateProps) {
  // Tick once a second so the rate-limit countdown stays current
  // while the panel is on screen. Cheap — the body of this effect
  // doesn't run more than ~60 times per minute and only renders
  // 4 chars of changing text. We deliberately avoid a global timer.
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (view.resetAtSeconds == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [view.resetAtSeconds]);

  const Icon = ICONS[view.kind] ?? AlertTriangle;
  const countdown = formatResetCountdown(view.resetAtSeconds);

  const handle = (action: AuditErrorAction): (() => void) | undefined => {
    switch (action.kind) {
      case "open-settings":
        return onOpenSettings;
      case "retry":
        return onRetry;
      case "reset":
        return onReset;
      case "dismiss":
        return onDismiss;
    }
  };

  return (
    <div
      role="alert"
      className={`glass mt-8 flex items-start gap-4 border-l-2 border-l-risk-critical/70 p-5 print:hidden ${VIEW_ENTER_CLASS}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-risk-critical/40 bg-risk-critical/10">
        <Icon className="h-5 w-5 text-risk-critical" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white">{view.title}</h3>
        <p className="mt-1 text-sm text-slate-300/85">{view.message}</p>
        {countdown ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-400">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{countdown}</span>
          </p>
        ) : null}
        {view.actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {view.actions.map((action, idx) => {
              const onClick = handle(action);
              if (!onClick) return null;
              const ActionIcon = actionIconFor(action);
              const primary = idx === 0;
              return (
                <button
                  key={`${action.kind}-${action.label}`}
                  type="button"
                  onClick={onClick}
                  className={
                    primary
                      ? "inline-flex items-center gap-2 rounded-lg border border-aurora-violet/40 bg-aurora-violet/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-aurora-violet/25"
                      : "inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                  }
                >
                  {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" /> : null}
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function actionIconFor(action: AuditErrorAction): LucideIcon | null {
  switch (action.kind) {
    case "open-settings":
      return Cog;
    case "retry":
      return RefreshCw;
    case "reset":
    case "dismiss":
      return null;
  }
}
