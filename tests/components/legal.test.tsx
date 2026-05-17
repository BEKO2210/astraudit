/**
 * Smoke tests for the German legal pages (Impressum +
 * Datenschutzerklärung) and the Footer links that point at them.
 *
 * The legal pages are mandatory for compliance with § 5 DDG (Digitale-
 * Dienste-Gesetz) and Art. 13 DSGVO. A regression that drops a
 * required field would be a real legal exposure, so we lock the
 * required clauses down with assertions.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Footer } from "../../src/components/Footer";
import { Impressum } from "../../src/components/legal/Impressum";
import { Datenschutzerklaerung } from "../../src/components/legal/Datenschutzerklaerung";
import { I18nProvider } from "../../src/lib/i18n";

describe("Footer", () => {
  // Roadmap M4.3 slice 6a — Footer now consumes useTranslation().
  const renderFooter = () =>
    renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <Footer />
      </I18nProvider>,
    );

  it("renders the Impressum link", () => {
    const html = renderFooter();
    expect(html).toMatch(/href="[^"]*#\/impressum"/);
    expect(html).toContain(">Impressum<");
  });

  it("renders the Datenschutz link", () => {
    const html = renderFooter();
    expect(html).toMatch(/href="[^"]*#\/datenschutz"/);
    expect(html).toContain(">Datenschutz<");
  });
});

describe("<Impressum />", () => {
  const html = renderToStaticMarkup(<Impressum />);

  it("declares § 5 DDG (the legal hook the page is filed under)", () => {
    expect(html).toContain("§ 5 DDG");
  });

  it("names the responsible person and address (§ 5 Abs. 1 Nr. 1 DDG)", () => {
    expect(html).toContain("Belkis Aslani");
    expect(html).toContain("Vogelsangstraße 32");
    expect(html).toContain("71691 Freiberg am Neckar");
  });

  it("publishes a working email + phone (§ 5 Abs. 1 Nr. 2 DDG)", () => {
    expect(html).toContain("belkis.aslani@gmail.com");
    expect(html).toContain("+49 176 81462526");
  });

  it("names a content-responsible per § 18 Abs. 2 MStV", () => {
    expect(html).toContain("§ 18 Abs. 2 MStV");
  });

  it("includes the OS-Plattform link required for online services", () => {
    expect(html).toContain("ec.europa.eu/consumers/odr");
  });
});

describe("<Datenschutzerklaerung />", () => {
  const html = renderToStaticMarkup(<Datenschutzerklaerung />);

  it("names a Verantwortlicher with full DSGVO contact", () => {
    expect(html).toContain("Verantwortlicher");
    expect(html).toContain("Belkis Aslani");
    expect(html).toContain("belkis.aslani@gmail.com");
  });

  it("discloses the GitHub Pages hosting + log scope", () => {
    expect(html).toContain("GitHub Pages");
    expect(html).toContain("IP-Adresse");
  });

  it("discloses GitHub-API third-party calls", () => {
    expect(html).toContain("api.github.com");
    expect(html).toContain("raw.githubusercontent.com");
  });

  it("discloses every localStorage key the app uses", () => {
    expect(html).toContain("localStorage");
    expect(html).toContain("Theme");
    expect(html).toContain("Audit-Verlauf");
    expect(html).toContain("Cache");
    expect(html).toContain("Personal Access Token");
  });

  it("lists every Art. 15-22 right and the Beschwerderecht", () => {
    expect(html).toContain("Art. 15 DSGVO");
    expect(html).toContain("Art. 16 DSGVO");
    expect(html).toContain("Art. 17 DSGVO");
    expect(html).toContain("Art. 18 DSGVO");
    expect(html).toContain("Art. 20 DSGVO");
    expect(html).toContain("Art. 21 DSGVO");
    expect(html).toContain("Art. 77 DSGVO");
  });

  it("names the competent Aufsichtsbehörde for Baden-Württemberg", () => {
    expect(html).toContain("Baden-Württemberg");
    expect(html).toContain("Königstraße 10a");
  });

  it("explicitly states no cookies / no tracking / no analytics", () => {
    expect(html).toContain("keine Cookies");
    expect(html).toContain("kein Webanalyse-Tracking");
  });

  it("invokes the right legal grounds (DSGVO + TTDSG)", () => {
    expect(html).toContain("Art. 6 Abs. 1 lit. f DSGVO");
    expect(html).toContain("§ 25 Abs. 2 Nr. 2 TTDSG");
  });
});
