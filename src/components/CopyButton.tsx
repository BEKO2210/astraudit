import { Check, Copy } from "lucide-react";
import { useState } from "react";

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
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Permissions or non-secure context — silent fallback. We don't
      // surface an error toast here because the affected user is going
      // to long-press / right-click to copy anyway.
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
