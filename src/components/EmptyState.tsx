import { Compass, Layers, ShieldQuestion, Sparkles } from "lucide-react";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";
import { useTranslation } from "../lib/i18n";
import type { TranslationKey } from "../lib/i18n";

// Roadmap M4.3 slice 2 — feature copy comes from the i18n catalog
// so DE / JA hosts get translated cards. Icons + accent colour
// stay declarative here; only the localisable strings reference
// translation keys.
const FEATURES: Array<{
  icon: typeof Compass;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  { icon: Compass, titleKey: "empty.feature1.title", bodyKey: "empty.feature1.body" },
  { icon: Layers, titleKey: "empty.feature2.title", bodyKey: "empty.feature2.body" },
  { icon: ShieldQuestion, titleKey: "empty.feature3.title", bodyKey: "empty.feature3.body" },
  { icon: Sparkles, titleKey: "empty.feature4.title", bodyKey: "empty.feature4.body" },
];

export function EmptyState() {
  const { t } = useTranslation();
  // The card titles are rendered as <h3> for visual sizing, but we
  // emit a visually-hidden <h2> wrapper so the heading hierarchy
  // stays sequential — that's the WCAG / Lighthouse `heading-order`
  // contract. Phase 4.2.
  return (
    <section
      className={`mt-10 ${VIEW_ENTER_CLASS}`}
      aria-labelledby="empty-state-heading"
    >
      <h2 id="empty-state-heading" className="sr-only">
        {t("empty.heading")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.titleKey} className="glass p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                <f.icon className="h-4 w-4 text-aurora-cyan" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                {t(f.titleKey)}
              </h3>
            </div>
            <p className="mt-3 text-sm text-slate-300/85">{t(f.bodyKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
