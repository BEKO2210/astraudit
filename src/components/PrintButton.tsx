import { Printer } from "lucide-react";

interface PrintButtonProps {
  className?: string;
}

export function PrintButton({ className = "" }: PrintButtonProps) {
  if (typeof window === "undefined") return null;
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Save audit as PDF"
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white print:hidden ${className}`}
    >
      <Printer className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Save as PDF</span>
      <span className="sm:hidden">PDF</span>
    </button>
  );
}
