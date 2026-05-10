import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { pushToast } from "../lib/ui/toastStore";

// Inline icon-flip stays the primary success affordance for copies —
// every research-backed toast guideline (Sonner, Radix, ARIA APG)
// recommends *not* emitting a toast when the affordance already shows
// inline confirmation. We only escalate to a toast when something
// fails, so the user actually learns the outcome.

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "ghost" | "solid";
  withText?: boolean;
}

/**
 * Single-click "Copy to clipboard" button. Uses the native Clipboard API
 * (navigator.clipboard.writeText). Falls back silently if the API is not
 * available (e.g. non-secure context). Hidden when printing.
 */
export function CopyButton({
  value,
  label = "Copy",
  className = "",
  size = "sm",
  variant = "ghost",
  withText = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      pushToast({
        tone: "warn",
        message: "Clipboard unavailable",
        detail:
          "Try long-pressing or right-clicking to copy manually — your browser blocks the modern API in this context.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast({
        tone: "error",
        message: "Could not copy to clipboard",
        detail: "Browser blocked the request.",
      });
    }
  };

  const sizeClass = withText
    ? size === "md"
      ? "h-8 px-2.5 text-xs gap-1.5"
      : "h-6 px-2 text-[11px] gap-1"
    : size === "md"
      ? "h-8 w-8"
      : "h-6 w-6";

  const iconSize = size === "md" ? "h-4 w-4" : "h-3 w-3";

  const variantClass =
    variant === "solid"
      ? "border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]"
      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied!" : label}
      data-print-hide="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-md border transition print:hidden ${variantClass} ${sizeClass} ${className}`}
    >
      {copied ? (
        <Check className={`text-aurora-mint ${iconSize}`} />
      ) : (
        <Copy className={iconSize} />
      )}
      {withText ? <span>{copied ? "Copied" : label}</span> : null}
    </button>
  );
}
