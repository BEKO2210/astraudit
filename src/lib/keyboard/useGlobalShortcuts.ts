/**
 * Global keyboard shortcuts.
 *
 * - Cmd/Ctrl+K toggles the command palette.
 * - "g <key>" jumps to a section by id (vim-style chord, max 1.2 s
 *   between presses).
 * - "?" opens the shortcut cheat sheet.
 * - "/" focuses the repo input.
 * - Escape is handled per-dialog.
 *
 * Shortcuts are suppressed when the user is typing into an input,
 * textarea, or contenteditable element so we don't hijack their text.
 */

import { useEffect, useRef } from "react";
import { getKeymap, matchesBinding } from "./keymapStore";

export interface GlobalShortcutHandlers {
  /** Toggle the command palette. */
  onPalette: () => void;
  /** Jump to a section by id (overview, score, story, …). */
  onJump: (sectionId: string) => void;
  /** Open the cheat sheet. */
  onCheatSheet: () => void;
  /** Focus the main repo input. */
  onFocusInput: () => void;
}

const G_PREFIX_MAP: Record<string, string> = {
  o: "overview",
  s: "score",
  t: "story",
  r: "readme",
  i: "insights",
  g: "graph",
  f: "findings",
  c: "structure", // (c)ode structure
  k: "stack",
  m: "maintenance",
  b: "onboarding", // (b)uild / boot
  n: "next",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

const G_PREFIX_TIMEOUT_MS = 1200;

export function useGlobalShortcuts(handlers: GlobalShortcutHandlers): void {
  const refs = useRef(handlers);
  refs.current = handlers;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let pendingG = false;
    let pendingTimer: number | undefined;

    const cancelPending = () => {
      pendingG = false;
      if (pendingTimer) {
        window.clearTimeout(pendingTimer);
        pendingTimer = undefined;
      }
    };

    const handler = (e: KeyboardEvent) => {
      // Roadmap M7.2 — resolve the keymap on every event so a
      // rebinding done in Settings takes effect immediately
      // without re-mounting. Cheap (single localStorage read +
      // 3-key merge); much simpler than wiring a subscription.
      const keymap = getKeymap();

      // Palette (default Cmd/Ctrl+K) — fires regardless of
      // focus, mirroring the editor convention.
      if (matchesBinding(e, keymap.palette)) {
        e.preventDefault();
        cancelPending();
        refs.current.onPalette();
        return;
      }

      // Editable-target gate for the un-prefixed shortcuts —
      // we never want to hijack the user's typing.
      if (isEditableTarget(e.target)) {
        // Still allow Cmd/Ctrl-based bindings on inputs by
        // checking against bindings that *require* a modifier.
        // (palette already returned above; the other two
        //  defaults don't require modifiers.)
      }

      if (matchesBinding(e, keymap.cheatSheet)) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        cancelPending();
        refs.current.onCheatSheet();
        return;
      }

      if (matchesBinding(e, keymap.focusInput)) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        cancelPending();
        refs.current.onFocusInput();
        return;
      }

      // The vim-style `g <key>` chord map stays hard-coded —
      // it's not part of the M7.2 rebindable surface.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      // "g <key>" two-step jump.
      if (pendingG) {
        const sectionId = G_PREFIX_MAP[e.key.toLowerCase()];
        if (sectionId) {
          e.preventDefault();
          refs.current.onJump(sectionId);
        }
        cancelPending();
        return;
      }

      if (e.key === "g" || e.key === "G") {
        pendingG = true;
        pendingTimer = window.setTimeout(cancelPending, G_PREFIX_TIMEOUT_MS);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      cancelPending();
    };
  }, []);
}

/** Exposed for tests. */
export const __test = {
  G_PREFIX_MAP,
  isEditableTarget,
};
