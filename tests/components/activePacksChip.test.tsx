/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../../src/lib/i18n";
import { ActivePacksChip } from "../../src/components/ActivePacksChip";

function renderChip(packs: string[]): string {
  return renderToStaticMarkup(
    <I18nProvider initialLocale="en">
      <ActivePacksChip enabledPacks={packs} />
    </I18nProvider>,
  );
}

describe("<ActivePacksChip /> (M5.1)", () => {
  it("renders nothing when no packs are enabled", () => {
    expect(renderChip([])).toBe("");
  });

  it("renders the chip with localized labels for active packs", () => {
    const html = renderChip(["a11y", "i18n"]);
    expect(html).toContain('data-testid="active-packs-chip"');
    expect(html).toContain("Active rule packs");
    expect(html).toContain("Accessibility");
    expect(html).toContain("Internationalisation");
  });

  it("ignores unknown pack ids defensively", () => {
    const html = renderChip(["a11y", "wat", "fnord"]);
    expect(html).toContain("Accessibility");
    expect(html).not.toContain("wat");
    expect(html).not.toContain("fnord");
  });

  it("hides entirely when only unknown ids are passed", () => {
    expect(renderChip(["fnord"])).toBe("");
  });
});
