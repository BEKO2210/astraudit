import { Check, Compass, Sparkles } from "lucide-react";
import type { OnboardingStep } from "../lib/audit/copyEngine";
import { CopyButton } from "./CopyButton";
import { EmptyPanelState } from "./ui/EmptyPanelState";
import { useTranslation } from "../lib/i18n";

interface OnboardingPanelProps {
  steps: OnboardingStep[];
}

export function OnboardingPanel({ steps }: OnboardingPanelProps) {
  const { t } = useTranslation();
  // Phase 5.5 — was `return null` (silently dropped the section).
  // Now a coherent empty state so users who scrolled here looking
  // for setup steps know Astraudit looked and found nothing
  // automation-worthy, rather than thinking the panel broke.
  if (steps.length === 0) {
    return (
      <EmptyPanelState
        icon={Sparkles}
        title={t("onboarding.emptyTitle")}
        description={t("onboarding.emptyDescription")}
        accentClass="text-aurora-cyan"
      />
    );
  }
  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-aurora-mint" />
        <h3 className="text-sm font-semibold text-white">
          {t("onboarding.heading")}
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">{t("onboarding.subtitle")}</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, idx) => (
          <li
            key={step.id}
            className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10"
            data-print-card
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-xs font-semibold text-white">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">
                    {step.title}
                  </h4>
                  {step.optional ? (
                    <span className="pill text-slate-400">
                      {t("onboarding.pillOptional")}
                    </span>
                  ) : (
                    <span className="pill text-aurora-mint border-aurora-mint/30 bg-aurora-mint/10">
                      <Check className="h-3 w-3" />
                      {t("onboarding.pillRecommended")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300/85">
                  {step.rationale}
                </p>
                {step.command ? (
                  <div className="relative mt-2">
                    <pre className="max-w-full overflow-x-auto rounded-lg border border-white/5 bg-black/40 px-3 py-2 pr-10 text-[12px] text-slate-200 scrollbar-thin">
                      <code className="font-mono whitespace-pre">{step.command}</code>
                    </pre>
                    <CopyButton
                      value={step.command}
                      label={t("onboarding.copyCommand")}
                      className="absolute right-1.5 top-1.5"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
