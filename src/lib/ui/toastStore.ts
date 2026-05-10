/**
 * Toast notification store.
 *
 * Design notes (Phase 2.8.1, derived from research into Sonner /
 * Radix Toast / ShadCN UI / ARIA APG / Apple HIG / Material 3):
 *
 * 1. **Use sparingly.** Toasts are noisy. They are reserved for
 *    actions whose outcome is *not* visually evident (a download
 *    started, an item removed, an async failure) — never as a
 *    cheaper alternative to inline confirmation.
 * 2. **Variants** correspond to ARIA live-region semantics:
 *      - success / info / loading → role="status", aria-live="polite"
 *      - warn / error → role="alert", aria-live="assertive"
 *    The host component passes through the right aria-live attribute
 *    per toast.
 * 3. **Per-tone TTL defaults** match Sonner's recommendations:
 *      success / info: 4 s, warn: 5 s, error: 6 s, loading: ∞.
 *    Callers can override via `ttl`.
 * 4. **Pause-on-interaction.** When the host pauses (hover, focus,
 *    or document tab hidden), every visible toast pauses its timer
 *    *with millisecond precision*; resuming continues from where it
 *    left off so a user who briefly scrubs a toast does not lose the
 *    rest of the visible time.
 * 5. **Stack cap.** The store keeps every toast that hasn't expired,
 *    but the host only renders the newest `MAX_VISIBLE` (4). This
 *    prevents long-lived toast spam while still surfacing rapid
 *    bursts in order.
 * 6. **No swipe-to-dismiss yet.** Sonner ships it; we deliberately
 *    keep this minimal — the close button + Esc covers the same
 *    intent without adding gesture code.
 * 7. **Reduced motion** is honoured by the *component*, not the
 *    store. The store stays pure pub/sub.
 *
 * The store is intentionally framework-free: any subscriber gets a
 * snapshot of the active toast list whenever it changes. React just
 * happens to be one consumer (`<ToastHost />`).
 */

export type ToastTone = "success" | "info" | "warn" | "error" | "loading";

export interface ToastAction {
  /** Visible label on the action button. Keep < ~12 chars. */
  label: string;
  /** Invoked on click. The toast is dismissed afterwards unless the
   *  handler returns `false`. */
  onClick: () => void | false | Promise<void | false>;
}

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  detail?: string;
  ttl: number; // ms; Number.POSITIVE_INFINITY for persistent
  action?: ToastAction;
  createdAt: number;
}

export type ToastInput = Omit<Toast, "id" | "createdAt" | "ttl"> & {
  ttl?: number;
};

type Listener = (toasts: Toast[]) => void;

/** Visible cap. Older toasts are still tracked for queue ordering. */
export const MAX_VISIBLE = 4;

/** Default TTL per tone, in ms. */
const DEFAULT_TTL: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  warn: 5000,
  error: 6000,
  loading: Number.POSITIVE_INFINITY,
};

interface RuntimeState {
  toasts: Toast[];
  listeners: Set<Listener>;
  timers: Map<number, ReturnType<typeof setTimeout>>;
  /** Wall time (ms since epoch) when the timer was last (re)started. */
  startedAt: Map<number, number>;
  /** Remaining ms when paused. Removed when the timer is running. */
  remaining: Map<number, number>;
  paused: boolean;
  nextId: number;
}

const state: RuntimeState = {
  toasts: [],
  listeners: new Set(),
  timers: new Map(),
  startedAt: new Map(),
  remaining: new Map(),
  paused: false,
  nextId: 0,
};

function emit(): void {
  const snapshot = state.toasts.slice();
  for (const l of state.listeners) l(snapshot);
}

function clearTimerFor(id: number): void {
  const handle = state.timers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    state.timers.delete(id);
  }
  state.startedAt.delete(id);
}

function scheduleDismiss(id: number, ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  if (typeof setTimeout === "undefined") return;
  state.startedAt.set(id, Date.now());
  state.timers.set(
    id,
    setTimeout(() => dismissToast(id), ms),
  );
}

export function subscribeToasts(listener: Listener): () => void {
  state.listeners.add(listener);
  listener(state.toasts.slice());
  return () => {
    state.listeners.delete(listener);
  };
}

export function pushToast(input: ToastInput): number {
  state.nextId += 1;
  const id = state.nextId;
  const ttl = input.ttl ?? DEFAULT_TTL[input.tone];
  const toast: Toast = {
    id,
    tone: input.tone,
    message: input.message,
    detail: input.detail,
    action: input.action,
    ttl,
    createdAt: Date.now(),
  };
  state.toasts = [...state.toasts, toast];
  if (state.paused) {
    state.remaining.set(id, ttl);
  } else {
    scheduleDismiss(id, ttl);
  }
  emit();
  return id;
}

export function updateToast(id: number, patch: Partial<ToastInput>): void {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const current = state.toasts[idx];
  const next: Toast = {
    ...current,
    ...patch,
    ttl: patch.ttl ?? current.ttl,
  };
  state.toasts = [
    ...state.toasts.slice(0, idx),
    next,
    ...state.toasts.slice(idx + 1),
  ];
  // Reset timer if the tone or ttl changed.
  if (patch.ttl !== undefined || patch.tone !== undefined) {
    clearTimerFor(id);
    if (state.paused) {
      state.remaining.set(id, next.ttl);
    } else {
      scheduleDismiss(id, next.ttl);
    }
  }
  emit();
}

export function dismissToast(id: number): void {
  const before = state.toasts.length;
  state.toasts = state.toasts.filter((t) => t.id !== id);
  state.remaining.delete(id);
  clearTimerFor(id);
  if (state.toasts.length !== before) emit();
}

export function dismissAll(): void {
  if (state.toasts.length === 0) return;
  state.toasts = [];
  for (const id of state.timers.keys()) clearTimerFor(id);
  state.startedAt.clear();
  state.remaining.clear();
  emit();
}

/**
 * Pause every running toast timer. Idempotent. Called when the host
 * sees hover / focus-within / document.hidden.
 */
export function pauseAll(): void {
  if (state.paused) return;
  state.paused = true;
  for (const toast of state.toasts) {
    if (!Number.isFinite(toast.ttl)) continue;
    const startedAt = state.startedAt.get(toast.id);
    if (startedAt === undefined) continue;
    const elapsed = Date.now() - startedAt;
    const left = Math.max(0, toast.ttl - elapsed);
    state.remaining.set(toast.id, left);
    clearTimerFor(toast.id);
  }
}

/** Resume every paused toast from its remembered remaining time. */
export function resumeAll(): void {
  if (!state.paused) return;
  state.paused = false;
  for (const toast of state.toasts) {
    if (!Number.isFinite(toast.ttl)) continue;
    const left = state.remaining.get(toast.id);
    if (left === undefined) continue;
    state.remaining.delete(toast.id);
    scheduleDismiss(toast.id, left);
  }
}

export function isPaused(): boolean {
  return state.paused;
}

/** TTL defaults per tone (read-only export for tests + UI hints). */
export function defaultTtl(tone: ToastTone): number {
  return DEFAULT_TTL[tone];
}

/** Test-only reset. */
export function __resetForTests(): void {
  state.toasts = [];
  state.listeners.clear();
  for (const id of state.timers.keys()) clearTimerFor(id);
  state.startedAt.clear();
  state.remaining.clear();
  state.paused = false;
  state.nextId = 0;
}
