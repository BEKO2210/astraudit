/**
 * Phase 5.8 — multi-format download menu.
 *
 * Sits next to ShareButton / PrintButton in the dashboard header.
 * One click opens a small popover with Markdown / JSON / AsciiDoc
 * choices; selecting one triggers a browser download via a Blob URL
 * (no backend, no external library).
 *
 * Accessibility:
 *   - The trigger is a real `<button type="button">` with an
 *     `aria-haspopup="menu"` + `aria-expanded` pair.
 *   - The popover is `role="menu"`; each option is `role="menuitem"`.
 *   - Esc closes; click-outside closes; focus returns to the trigger.
 *
 * The menu is `print:hidden` because it's interactive chrome with no
 * meaning on a printed page.
 */

import { useEffect, useId, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { AuditResult } from "../types/audit";
import {
  exportAudit,
  downloadExportFile,
  type ExportFormat,
} from "../lib/export/auditExport";
import { pushToast } from "../lib/ui/toastStore";

interface ExportMenuProps {
  result: AuditResult;
  className?: string;
}

const OPTIONS: Array<{ format: ExportFormat; label: string; hint: string }> = [
  { format: "markdown", label: "Markdown (.md)", hint: "Pasteable into a GitHub issue or wiki" },
  { format: "json", label: "JSON (.json)", hint: "Drop-in for jq / dashboards" },
  { format: "asciidoc", label: "AsciiDoc (.adoc)", hint: "Antora / Asciidoctor pipelines" },
];

export function ExportMenu({ result, className = "" }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on Esc + click-outside, restoring focus to the trigger so
  // keyboard users don't get parked in the void (WCAG 2.4.3 Focus
  // Order).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  const handlePick = (format: ExportFormat) => {
    try {
      const file = exportAudit(result, format);
      downloadExportFile(file);
      pushToast({
        tone: "success",
        message: "Export downloaded",
        detail: file.filename,
      });
    } catch (err) {
      pushToast({
        tone: "warn",
        message: "Could not generate export",
        detail: (err as Error)?.message ?? "Unknown failure.",
      });
    } finally {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white print:hidden"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
        <span className="sm:hidden">⤓</span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Export format"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 shadow-glow backdrop-blur print:hidden"
        >
          <ul className="divide-y divide-white/5">
            {OPTIONS.map((opt) => (
              <li key={opt.format}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handlePick(opt.format)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs transition hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-aurora-violet/60"
                >
                  <span className="font-medium text-white">{opt.label}</span>
                  <span className="text-[11px] text-slate-400">{opt.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
