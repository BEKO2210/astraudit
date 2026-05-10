/**
 * Share-an-audit action.
 *
 * Tries the native Web Share API first (mobile + a few desktop
 * browsers), falls back to copying the URL to the clipboard. Returns
 * a discriminated result so the caller can decide whether to surface
 * a toast, an inline pill, or stay quiet.
 */

import type { RepoCoordinates } from "../../types/github";
import { formatShareUrl } from "./urlState";

export type ShareOutcome =
  | { kind: "shared" }
  | { kind: "copied" }
  | { kind: "cancelled" }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export async function performShare(
  coords: RepoCoordinates,
): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") return { kind: "unavailable" };

  const url = formatShareUrl(coords);
  const title = `Astraudit · ${coords.owner}/${coords.repo}`;

  type ShareableNavigator = Navigator & {
    share?: (data: { title?: string; url?: string }) => Promise<void>;
  };
  const nav = navigator as ShareableNavigator;

  if (typeof nav.share === "function") {
    try {
      await nav.share({ title, url });
      return { kind: "shared" };
    } catch (err) {
      // AbortError is fired when the user closes the share sheet —
      // not an error from our perspective.
      const name = (err as { name?: string }).name;
      if (name === "AbortError") return { kind: "cancelled" };
      // Fall through to clipboard.
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return { kind: "copied" };
    } catch (err) {
      return { kind: "error", message: (err as Error).message ?? "clipboard failed" };
    }
  }

  return { kind: "unavailable" };
}
