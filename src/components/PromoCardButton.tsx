/**
 * <PromoCardButton /> — Roadmap M8.2.
 *
 * Wraps `renderPromoCardSvg` into a single sticky-bar action.
 * Click → dropdown menu offering:
 *   • Download .svg   (the canonical 1200×630 OG card)
 *   • Download .png   (rasterised via canvas, optional path)
 *   • Copy OG meta    (paste-ready `<meta>` snippet for READMEs)
 *
 * No telemetry. Everything happens client-side; the SVG is
 * generated synchronously from the AuditResult so there's no
 * round-trip + no server image hosting.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageDown, Share2 } from "lucide-react";
import type { AuditResult } from "../types/audit";
import { renderPromoCardSvg } from "../lib/promo/promoCardSvg";
import { pushToast } from "../lib/ui/toastStore";
import { useTranslation } from "../lib/i18n";

interface PromoCardButtonProps {
  result: AuditResult;
}

function safeName(fullName: string): string {
  return fullName.replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase();
}

function svgFor(result: AuditResult): string {
  return renderPromoCardSvg({
    fullName: result.bundle.metadata.fullName,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    grade: result.grade,
    verdict: result.headline || result.verdict,
    language: result.bundle.metadata.language,
    generatedAt: result.generatedAt,
  });
}

function triggerDownload(filename: string, blob: Blob): void {
  if (typeof URL === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Microtask-deferred revoke so the click handler had time
  // to consume the URL before the browser drops it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function svgToPngBlob(svg: string): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const img = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg image load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PromoCardButton({ result }: PromoCardButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fullName = result.bundle.metadata.fullName;
  const baseName = safeName(fullName);

  // Close the dropdown on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const downloadSvg = useCallback(() => {
    const svg = svgFor(result);
    triggerDownload(`astraudit-${baseName}.svg`, new Blob([svg], { type: "image/svg+xml" }));
    pushToast({ tone: "success", message: t("promo.svgSavedToast") });
    setOpen(false);
  }, [result, baseName, t]);

  const downloadPng = useCallback(async () => {
    const svg = svgFor(result);
    const png = await svgToPngBlob(svg);
    if (!png) {
      pushToast({ tone: "error", message: t("promo.pngFailedToast") });
      setOpen(false);
      return;
    }
    triggerDownload(`astraudit-${baseName}.png`, png);
    pushToast({ tone: "success", message: t("promo.pngSavedToast") });
    setOpen(false);
  }, [result, baseName, t]);

  const copyMeta = useCallback(async () => {
    const url = `https://beko2210.github.io/astraudit/#/audit/${fullName}`;
    const snippet = [
      `<!-- Astraudit promo card -->`,
      `<a href="${url}">`,
      `  <img alt="Astraudit ${result.grade} · ${result.totalScore}/${result.maxScore}" src="./astraudit-${baseName}.svg" width="600" />`,
      `</a>`,
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(snippet);
        pushToast({ tone: "success", message: t("promo.metaCopiedToast") });
      } catch {
        pushToast({ tone: "error", message: t("promo.metaFailedToast") });
      }
    } else {
      pushToast({ tone: "error", message: t("promo.metaFailedToast") });
    }
    setOpen(false);
  }, [fullName, baseName, result, t]);

  return (
    <div ref={wrapRef} className="relative inline-flex print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("promo.menuAria")}
        className="inline-flex min-h-[1.625rem] items-center gap-1.5 rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-2.5 py-1 text-[11px] font-medium text-aurora-violet transition hover:bg-aurora-violet/20"
      >
        <Share2 className="h-3 w-3" />
        {t("promo.label")}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={t("promo.menuAria")}
          className="absolute right-0 top-full z-30 mt-1 min-w-[14rem] overflow-hidden rounded-lg border border-white/10 bg-ink-900/95 p-1 text-sm shadow-glow backdrop-blur"
        >
          <MenuItem onClick={downloadSvg} icon={<ImageDown className="h-3.5 w-3.5" />}>
            {t("promo.downloadSvg")}
          </MenuItem>
          <MenuItem onClick={downloadPng} icon={<ImageDown className="h-3.5 w-3.5" />}>
            {t("promo.downloadPng")}
          </MenuItem>
          <MenuItem onClick={copyMeta} icon={<Share2 className="h-3.5 w-3.5" />}>
            {t("promo.copyMeta")}
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-slate-300 hover:bg-white/[0.06] hover:text-white"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
