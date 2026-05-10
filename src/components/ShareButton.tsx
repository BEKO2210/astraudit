import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import type { RepoCoordinates } from "../types/github";
import { formatShareUrl } from "../lib/share/urlState";
import { pushToast } from "../lib/ui/toastStore";

// Inline "Link copied" pill is the primary success affordance, same
// as CopyButton. Toasts here are only for the async-failure path so
// users actually see what went wrong.

interface ShareButtonProps {
  coords: RepoCoordinates;
  className?: string;
}

/**
 * "Share" button for the current audit.
 *
 * Uses the native Web Share API when available (mobile + some desktop
 * browsers), otherwise falls back to copying the URL with a 1.8 s
 * "Copied" confirmation. Hidden when printing.
 */
export function ShareButton({ coords, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const url = formatShareUrl(coords);
    const title = `Astraudit · ${coords.owner}/${coords.repo}`;

    type ShareableNavigator = Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };
    const nav = navigator as ShareableNavigator;
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard copy.
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        pushToast({
          tone: "warn",
          message: "Could not copy the share link",
          detail:
            "Browser blocked clipboard access. The full URL is in your address bar.",
        });
        // Silent fallback: in a non-secure context the user will see the URL in the bar anyway.
      }
    }
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
