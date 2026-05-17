import { Printer } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";
import { useTranslation } from "../lib/i18n";

interface PrintButtonProps {
  className?: string;
}

export function PrintButton({ className = "" }: PrintButtonProps) {
  const { t } = useTranslation();
  if (typeof window === "undefined") return null;
  const label = t("dashboard.fab.print");
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={() => window.print()}
        aria-label={label}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white print:hidden ${className}`}
      >
        <Printer className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">PDF</span>
      </button>
    </Tooltip>
  );
}
