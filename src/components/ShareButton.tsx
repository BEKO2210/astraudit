import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import type { RepoCoordinates } from "../types/github";
import { performShare } from "../lib/share/shareAction";
import { pushToast } from "../lib/ui/toastStore";

// Inline "Link copied" pill is the primary success affordance, same
// as CopyButton. Toasts here are only for the async-failure path so
// users actually learn what went wrong.

interface ShareButtonProps {
  coords: RepoCoordinates;
  className?: string;
}

/**
 * "Share" button for the current audit.
 *
 * Uses the native Web Share API when available (mobile + some desktop
 * browsers), otherwise falls back to copying the URL with a 1.8 s
 * "Copied" confirmation. Hidden when printing. The share / copy
 * orchestration lives in `lib/share/shareAction.ts` so the SpeedDial
 * FAB can re-use the exact same flow.
 */
export function ShareButton({ coords, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const outcome = await performShare(coords);
    if (outcome.kind === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } else if (outcome.kind === "error") {
      pushToast({
        tone: "warn",
        message: "Could not copy the share link",
        detail:
          "Browser blocked clipboard access. The full URL is in your address bar.",
      });
    }
    // "shared", "cancelled", "unavailable" stay silent — the OS share
    // sheet either succeeded or the user dismissed it.
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? "Link copied" : "Share this audit"}
      title={copied ? "Link copied" : "Share this audit"}
      data-print-hide="true"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition print:hidden ${
        copied
          ? "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
      } ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{copied ? "Link copied" : "Share"}</span>
      <span className="sm:hidden">{copied ? "✓" : "Share"}</span>
    </button>
  );
}
