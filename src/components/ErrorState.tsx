import { AlertTriangle } from "lucide-react";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";

interface ErrorStateProps {
  title: string;
  message: string;
  onReset?: () => void;
}

export function ErrorState({ title, message, onReset }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`glass mt-8 flex items-start gap-4 border-l-2 border-l-risk-critical/70 p-5 ${VIEW_ENTER_CLASS}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-risk-critical/40 bg-risk-critical/10">
        <AlertTriangle className="h-5 w-5 text-risk-critical" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-300/85">{message}</p>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
          >
            Try a different repository
          </button>
        ) : null}
      </div>
    </div>
  );
}
