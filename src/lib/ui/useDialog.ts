/**
 * `useDialog` — the four behaviours every modal needs (Phase 5.3).
 *
 * The WAI-ARIA APG modal-dialog pattern (May-2026 revision)
 * specifies four runtime behaviours alongside the static
 * `role="dialog"` + `aria-modal="true"` markup:
 *
 *   1. **Focus trap** — once opened, Tab + Shift-Tab cycle through
 *      the dialog's focusable descendants only. Focus must not
 *      escape via the keyboard.
 *   2. **Focus restore** — on close, focus returns to the element
 *      that opened the dialog so a keyboard-only user lands back
 *      where they were.
 *   3. **Body scroll lock** — the page underneath must not scroll
 *      while a modal is open. Without this, `aria-modal="true"`
 *      lies to assistive tech ("outside is unreachable") while
 *      sighted users can still pan the background.
 *   4. **Escape dismissal** — the standard exit affordance for
 *      every screen reader and every keyboard.
 *
 * Each existing dialog used to do these inconsistently — most had
 * Esc, none had focus trap or scroll lock, and focus restoration
 * was implicit (and unreliable). This hook centralises all four so
 * `<SettingsDialog />`, `<HistoryDialog />`, `<CompareDialog />`,
 * `<ShortcutsDialog />`, `<BadgeDialog />`, and `<CommandPalette />`
 * all opt into the same accessible baseline.
 *
 * Pre-build research (2026-05-10):
 *   - W3C WAI · *Modal Dialog Pattern* — focus trap mechanics,
 *     focus restoration, Esc dismissal, aria-modal semantics.
 *     https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * Ref counter: multiple dialogs can stack (rare, but the
 * settings dialog → confirm-clear flow could). The hook keeps a
 * shared open count so the body-scroll lock only releases when
 * every dialog has unmounted.
 */

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(",");

let openDialogCount = 0;
let savedBodyStyles: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyTouchAction: string;
  htmlScrollTop: number;
} | null = null;

/**
 * Body scroll lock — Phase 5.x followup bugfix.
 *
 * Earlier iteration used the `position: fixed; top: -<scrollY>;
 * width: 100%` trick recommended by react-modal / headlessui /
 * radix to defeat the iOS Safari overflow-hidden bypass. That
 * solved the iOS chain-scroll bug but caused a much worse one:
 * Chromium treats a fixed-position body as a containing block for
 * fixed-position descendants, so the BadgeDialog's overlay
 * (`fixed inset-0`) inflated to body-height (~7,000 px) and the
 * card was positioned at y≈3,500 px — completely below the visible
 * viewport. The screenshot evidence: the page dimmed (overlay was
 * there) but the card was nowhere to be seen.
 *
 * The cleanest fix that satisfies BOTH constraints (no body-fixed
 * containing block, no iOS chain-scroll):
 *  1. `overflow: hidden` on both <html> AND <body>. The double-
 *     application is what stops the iOS touchmove leak — overflow
 *     hidden on body alone is silently bypassed by iOS, but
 *     applying it to <html> too is honoured.
 *  2. `touch-action: none` on body so we don't even attempt to
 *     scroll the document under finger drag (Modal scrolls itself
 *     via its own internal containers).
 *  3. We save and restore the original scroll position on
 *     <html> so users land back where they were on dialog close.
 *     No position-fixed gymnastics needed; <html> with overflow:
 *     hidden simply pins the current scrollTop until released.
 *
 * `overscroll-behavior: contain` on `[role="dialog"]` and the
 * `.bottom-sheet-card` (already in globals.css) handles the rest.
 */
function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (openDialogCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    savedBodyStyles = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      htmlScrollTop: html.scrollTop || window.scrollY,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
  }
  openDialogCount += 1;
}

function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0 && savedBodyStyles) {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = savedBodyStyles.htmlOverflow;
    body.style.overflow = savedBodyStyles.bodyOverflow;
    body.style.touchAction = savedBodyStyles.bodyTouchAction;
    // Restore exactly where the user was. With overflow: hidden the
    // scroll position is preserved, but Safari has been observed to
    // clamp scrollTop on overflow flip — re-applying is cheap and
    // safe.
    window.scrollTo(0, savedBodyStyles.htmlScrollTop);
    savedBodyStyles = null;
  }
}

export interface UseDialogOptions {
  /** Whether the dialog is currently mounted + visible. */
  open: boolean;
  /** Called when the user dismisses via Escape. */
  onClose: () => void;
  /** Ref to the dialog's outermost element. Focus stays inside it. */
  containerRef: React.RefObject<HTMLElement>;
  /** Optional: ref to the element to focus on open. Defaults to the
   *  first focusable descendant of `containerRef`. */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * Wires the four modal behaviours into a single component. Pass
 * the dialog's outer-wrapper ref + the open/onClose tuple; the
 * hook handles everything else.
 */
export function useDialog({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: UseDialogOptions): void {
  // Keep a stable reference to the latest onClose so we don't
  // tear down + rebuild listeners every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    // 1. Save the element that had focus when the dialog opened so
    //    we can return focus to it on close (focus restore).
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // 2. Lock body scroll for as long as the dialog is open.
    lockBodyScroll();

    // 3. Move initial focus into the dialog. Prefer the explicit
    //    initialFocusRef; fall back to the first focusable descendant;
    //    fall back further to the dialog container itself.
    const moveInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (first) {
        first.focus();
      } else {
        // Last resort: focus the dialog itself so SR users hear it.
        container.tabIndex = -1;
        container.focus();
      }
    };
    // Defer focus by a frame so the DOM has settled — many dialogs
    // run their own open animations and a synchronous focus() can
    // race with the mount.
    const initialFocusTimer = window.setTimeout(moveInitialFocus, 0);

    // 4. Key handler — Esc dismisses, Tab/Shift-Tab cycles inside.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) => !el.hasAttribute("hidden") && el.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // We use capture so we win against children that stopPropagation
    // on Tab (e.g. an embedded code-mirror). Capture is also what
    // the WAI-ARIA examples use.
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(initialFocusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockBodyScroll();
      // 5. Focus restore — after listener cleanup so any synthetic
      //    blur on close doesn't fight us.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        try {
          previouslyFocused.focus({ preventScroll: true });
        } catch {
          /* node may have been removed; nothing we can do */
        }
      }
    };
    // We deliberately depend only on `open` — the refs are stable and
    // the onClose latest-value is read through onCloseRef each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
