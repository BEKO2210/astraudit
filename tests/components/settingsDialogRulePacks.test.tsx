/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../../src/lib/i18n";
import { SettingsDialog } from "../../src/components/SettingsDialog";
import type { RulePackId } from "../../src/lib/audit/rulePacks/types";

function renderDialog(packs: RulePackId[]): string {
  return renderToStaticMarkup(
    <I18nProvider initialLocale="en">
      <SettingsDialog
        open={true}
        onClose={() => {}}
        enabledPacks={packs}
        onChangeEnabledPacks={() => {}}
      />
    </I18nProvider>,
  );
}

describe("<SettingsDialog /> rule pack toggles (M5.5)", () => {
  it("renders the Rule packs heading + hint", () => {
    const html = renderDialog([]);
    expect(html).toContain("Rule packs");
    expect(html).toContain("URL flag");
  });

  it("renders a toggle for every supported pack with localized labels", () => {
    const html = renderDialog([]);
    expect(html).toContain("Accessibility");
    expect(html).toContain("Internationalisation");
    expect(html).toContain("TypeScript strictness");
    expect(html).toContain("Monorepo health");
  });

  it("marks enabled packs with aria-checked=true", () => {
    const html = renderDialog(["a11y", "i18n"]);
    // Crude but reliable: count aria-checked occurrences. We
    // expect 2 toggles "true" (a11y + i18n) and 2 "false".
    const trueCount = (html.match(/aria-checked="true"/g) ?? []).length;
    const falseCount = (html.match(/aria-checked="false"/g) ?? []).length;
    // The density radiogroup also emits aria-checked, so we can't
    // assert exact totals — but the rule-pack toggles add to the
    // count.
    expect(trueCount).toBeGreaterThanOrEqual(2);
    expect(falseCount).toBeGreaterThanOrEqual(2);
  });

  it("renders the descriptions under each pack name", () => {
    const html = renderDialog([]);
    expect(html).toContain("README alt‑text");
    expect(html).toContain("Locale files presence");
    expect(html).toContain("strict: true");
    expect(html).toContain("Workspaces declared");
  });
});
