/**
 * <ToastHost /> — single live-region for the toast stack.
 *
 * Accessibility (Phase 2.8.1, derived from research):
 *
 * - The wrapping container is `role="region" aria-label="Notifications"`.
 *   Each toast then carries its own role (`status` for success/info,
 *   `alert` for warn/error) and aria-live (polite/assertive). This
 *   matches the Radix Primitives sensitivity model and the recommendation
 *   from Adrian Roselli's "Defining Toast Messages" article.
 * - The host pauses every running toast timer on hover, on focus-within,
 *   and when the document tab becomes hidden — required by WCAG 2.1 AA
 *   timing-controllable criteria (success criterion 2.2.1).
 * - Toasts are not modal: focus is never trapped, the container does
 *   not steal focus, and Esc dismisses all only when no other dialog
 *   is open (so the dialog Esc still wins).
 * - Each toast carries an icon in addition to colour so colour-blind
 *   users still get the meaning.
 * - The slide-in animation is wrapped in `motion-safe:` so users with
 *   `prefers-reduced-motion` see a fade-only entry.
 *
 * Sources informing the design:
 *   - https://www.radix-ui.com/primitives/docs/components/toast
 *   - https://adrianroselli.com/2020/01/defining-toast-messages.html
 *   - https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html
 *   - https://github.com/emilkowalski/sonner
 *   - https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html
 */

import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTranslation } from "../lib/i18n";
import {
  dismissAll,
  dismissToast,
  MAX_VISIBLE,
  pauseAll,
  resumeAll,
  subscribeToasts,
  type Toast,
  type ToastTone,
} from "../lib/ui/toastStore";

type IconComponent = React.ComponentType<{ className?: string }>;

const TONE_ICON: Record<ToastTone, IconComponent> = {
  success: Check,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
  loading: Loader2,
};

const TONE_CLASS: Record<ToastTone, string> = {
  success: "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint",
  info: "border-aurora-cyan/40 bg-aurora-cyan/10 text-aurora-cyan",
  warn: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  error: "border-risk-critical/40 bg-risk-critical/10 text-risk-critical",
  loading: "border-aurora-violet/40 bg-aurora-violet/10 text-aurora-violet",
};

export function ToastHost() {
  const { t } = useTranslation();
  // Force-update once any toast list change arrives. We keep the latest
  // snapshot in a ref so the global keyboard / visibility handlers can
  // read it without stale-closure surprises.
  const [, force] = useReducer((x: number) => x + 1, 0);
  const toastsRef = useRef<Toast[]>([]);

  useEffect(
    () =>
      subscribeToasts((next) => {
        toastsRef.current = next;
        force();
      }),
    [],
  );

  // WCAG 2.2.1 — pause auto-dismissal when the user can't see the
  // page. Resume when the tab is visible again.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => {
      if (document.hidden) pauseAll();
      else resumeAll();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Esc dismisses all toasts — but only when no other dialog has Esc
  // priority. We detect that via the presence of an aria-modal dialog.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (toastsRef.current.length === 0) return;
      const dialogOpen = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (dialogOpen) return;
      e.preventDefault();
      dismissAll();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onMouseEnter = useCallback(() => pauseAll(), []);
  const onMouseLeave = useCallback(() => resumeAll(), []);
  const onFocus = useCallback(() => pauseAll(), []);
  const onBlur = useCallback((e: React.FocusEvent) => {
    // Resume only when focus leaves the entire region.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      resumeAll();
    }
  }, []);

  // Render the newest MAX_VISIBLE only — the rest stay in the store
  // queue and surface as older ones expire.
  const visible = toastsRef.current.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={t("toast.regionLabel")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-3 pb-3 sm:bottom-5 sm:left-auto sm:right-5 sm:items-end sm:px-0 print:hidden"
    >
      {visible.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { t } = useTranslation();
  const Icon = TONE_ICON[toast.tone];
  const isAssertive = toast.tone === "warn" || toast.tone === "error";

  return (
    <div
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      aria-atomic="true"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border bg-ink-900/95 px-3 py-2 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] backdrop-blur transition motion-safe:animate-[toast-in_180ms_ease-out] ${TONE_CLASS[toast.tone]}`}
    >
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          toast.tone === "loading" ? "motion-safe:animate-spin" : ""
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{toast.message}</p>
        {toast.detail ? (
          <p className="mt-0.5 break-words text-xs text-slate-400">
            {toast.detail}
          </p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={async () => {
              const result = await toast.action!.onClick();
              if (result !== false) dismissToast(toast.id);
            }}
            className="mt-1.5 inline-flex items-center rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-white hover:bg-white/[0.1]"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label={t("toast.dismiss")}
        // Phase 5.2 — was p-1 + h-3 = 20×20 px (under WCAG 2.5.8's
        // 24×24 floor). Bumped to p-1.5 + h-3.5 = 26×26.
        className="shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
