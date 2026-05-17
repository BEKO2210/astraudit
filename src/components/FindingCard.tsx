import { ShieldAlert } from "lucide-react";
import type { Finding, FindingCategory, Severity } from "../types/finding";
import type { RepoCoordinates } from "../types/github";
import { severityClass } from "../lib/utils/severity";
import { CopyButton } from "./CopyButton";
import { findingElementId, formatShareUrl } from "../lib/share/urlState";
import { useTranslation, type TranslationKey } from "../lib/i18n";

// Severity + category → catalog key. Inline so a renamed enum value
// triggers a typecheck error here rather than a missing translation
// at runtime.
const SEVERITY_KEY: Record<Severity, TranslationKey> = {
  critical: "severity.critical",
  high: "severity.high",
  medium: "severity.medium",
  low: "severity.low",
  info: "severity.info",
};

const CATEGORY_KEY: Record<FindingCategory, TranslationKey> = {
  security: "category.security",
  documentation: "category.documentation",
  quality: "category.quality",
  ci: "category.ci",
  structure: "category.structure",
  ecosystem: "category.ecosystem",
  maintenance: "category.maintenance",
  dx: "category.dx",
};

interface FindingCardProps {
  finding: Finding;
  /**
   * Roadmap M4.4 — present once the audit dashboard knows the
   * coords, so the per-finding "copy deep link" button can mint
   * `#/audit/owner/repo?focus=<id>` URLs. Omitted in print-only
   * embeds + storybook fixtures, in which case the deep-link
   * button stays hidden.
   */
  coords?: RepoCoordinates;
}

export function FindingCard({ finding, coords }: FindingCardProps) {
  const { t } = useTranslation();
  const deepLinkUrl = coords
    ? formatShareUrl(coords, undefined, { focus: finding.id })
    : null;
  return (
    <article
      id={findingElementId(finding.id)}
      className="overflow-hidden scroll-mt-24 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-shadow data-[astraudit-focus=true]:border-aurora-violet/60 data-[astraudit-focus=true]:shadow-[0_0_0_2px_rgba(122,92,255,0.45)]"
      data-print-card
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white">{finding.title}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className={`pill border ${severityClass(finding.severity)}`}
              >
                {t(SEVERITY_KEY[finding.severity])}
              </span>
              <span className="pill text-slate-300">
                {t(CATEGORY_KEY[finding.category])}
              </span>
              <span className="pill text-slate-400">
                {t("finding.confidenceLabel")}: {finding.confidence}
              </span>
            </div>
          </div>
        </div>
        {deepLinkUrl ? (
          <CopyButton
            value={deepLinkUrl}
            label={t("finding.copyDeepLink")}
            className="!h-7 !w-7 border-white/10 text-slate-500 hover:!text-white print:hidden"
          />
        ) : null}
      </header>
      <p className="mt-3 text-sm text-slate-300/85">{finding.description}</p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <dt className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {t("finding.evidenceLabel")}
          </dt>
          <dd className="mt-1 text-slate-300">{finding.evidence}</dd>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <dt className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {t("finding.recommendationLabel")}
          </dt>
          <dd className="mt-1 text-slate-300">{finding.recommendation}</dd>
        </div>
      </dl>
      {finding.affectedFiles.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {finding.affectedFiles.slice(0, 6).map((file) => (
            <span
              key={file}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/5 bg-black/40 px-1.5 py-0.5"
            >
              <code className="break-all font-mono text-[11px] text-slate-300">
                {file}
              </code>
              <CopyButton
                value={file}
                label={t("finding.copyPath")}
                className="!h-4 !w-4 !border-0 !bg-transparent !text-slate-500 hover:!text-white"
              />
            </span>
          ))}
          {finding.affectedFiles.length > 1 ? (
            <CopyButton
              value={finding.affectedFiles.join("\n")}
              label={t("finding.copyAllPaths")}
              withText
              className="border-white/10"
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
