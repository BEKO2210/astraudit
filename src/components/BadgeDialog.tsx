import { Award, Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildBadgeMarkdown,
  generateBadgeSvg,
  type BadgeStyle,
} from "../lib/badge/svgBadge";
import { formatShareUrl } from "../lib/share/urlState";
import { pushToast } from "../lib/ui/toastStore";
import { CopyButton } from "./CopyButton";

interface BadgeDialogProps {
  open: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  score: number;
  max: number;
  grade: string;
}

const STYLES: Array<{ id: BadgeStyle; label: string; hint: string }> = [
  { id: "flat", label: "Flat", hint: "shields.io look" },
  { id: "aurora", label: "Aurora", hint: "Astraudit brand" },
  { id: "minimal", label: "Minimal", hint: "score-only chip" },
];

function downloadSvg(filename: string, svg: string): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast({
      tone: "success",
      message: "Badge saved",
      detail: `Downloaded ${filename}. Commit it next to your README and embed it.`,
    });
  } catch (err) {
    pushToast({
      tone: "error",
      message: "Could not save the badge",
      detail: (err as Error).message,
    });
  }
}

export function BadgeDialog({
  open,
  onClose,
  owner,
  repo,
  score,
  max,
  grade,
}: BadgeDialogProps) {
  const [style, setStyle] = useState<BadgeStyle>("flat");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const svg = useMemo(
    () => generateBadgeSvg({ owner, repo, score, max, grade, style }),
    [owner, repo, score, max, grade, style],
  );

  const filename = `astraudit-${owner}-${repo}-${style}.svg`;
  const shareUrl = formatShareUrl({ owner, repo });
  const markdown = buildBadgeMarkdown(
    { owner, repo, score, max, grade, style },
    `./${filename}`,
    shareUrl,
  );

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-strong relative w-full max-w-xl rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Award className="h-4 w-4 text-aurora-mint" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Astraudit badge
            </h2>
            <p className="text-xs text-slate-500">
              Download the SVG, commit it next to your README, embed it.
              Astraudit has no backend — the values are baked into the file
              you save.
            </p>
          </div>
        </div>

        <div className="mt-4 inline-flex w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[11px]">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1 transition ${
                style === s.id
                  ? "bg-gradient-to-br from-aurora-violet/30 to-aurora-blue/20 text-white ring-1 ring-aurora-violet/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="font-medium">{s.label}</span>
              <span className="hidden text-slate-500 sm:inline">·</span>
              <span className="hidden text-slate-500 sm:inline">{s.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex min-h-[120px] items-center justify-center rounded-xl border border-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(122,92,255,0.06),transparent_60%)] bg-white/[0.02] p-4">
          <span
            // The HTML comes from generateBadgeSvg, which is a pure
            // string-builder over fully escaped inputs (see escapeXml).
            // Inline HTML is never executed at our origin because the
            // SVG is literal markup with no <script> elements.
            dangerouslySetInnerHTML={{ __html: svg }}
            className="block max-w-full"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSvg(filename, svg)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-blue px-3 py-1.5 text-sm font-semibold text-white shadow-glow"
          >
            <Download className="h-3.5 w-3.5" />
            Download {filename}
          </button>
          <CopyButton value={svg} label="Copy SVG source" withText />
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Markdown snippet
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Drop this into your README — it links the badge back to a fresh
            Astraudit run for this repo.
          </p>
          <div className="relative mt-2">
            <pre className="max-w-full overflow-x-auto rounded-lg border border-white/5 bg-black/40 px-3 py-2 pr-10 text-[12px] text-slate-200 scrollbar-thin">
              <code className="font-mono whitespace-pre-wrap break-words">
                {markdown}
              </code>
            </pre>
            <CopyButton
              value={markdown}
              label="Copy markdown"
              className="absolute right-1.5 top-1.5"
            />
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          The badge values are baked in at the time of download. Re-export
          whenever you want to publish a new score.
        </p>
      </div>
    </div>
  );
}
