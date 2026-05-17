/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../../src/lib/i18n";
import { WatchedDialog } from "../../src/components/WatchedDialog";
import {
  clearAllWatched,
  watchRepo,
} from "../../src/lib/watch/watchStore";

beforeEach(() => {
  clearAllWatched();
});
afterEach(() => {
  clearAllWatched();
});

describe("<WatchedDialog /> (M7.1.2)", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <WatchedDialog open={false} onClose={() => {}} onPick={() => {}} />
      </I18nProvider>,
    );
    expect(html).toBe("");
  });

  it("renders the empty hint when no repos are watched", () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <WatchedDialog open={true} onClose={() => {}} onPick={() => {}} />
      </I18nProvider>,
    );
    expect(html).toContain("No watched repositories yet");
    expect(html).toContain("Watched");
  });

  it("lists every watched repo with its baseline + unwatch button", () => {
    watchRepo(
      { owner: "facebook", repo: "react" },
      { totalScore: 88, maxScore: 100, grade: "A", findingCount: 3 },
    );
    watchRepo(
      { owner: "vercel", repo: "next.js" },
      { totalScore: 75, maxScore: 100, grade: "B", findingCount: 12 },
    );
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <WatchedDialog open={true} onClose={() => {}} onPick={() => {}} />
      </I18nProvider>,
    );
    expect(html).toContain("facebook/react");
    expect(html).toContain("vercel/next.js");
    expect(html).toContain("88/100");
    expect(html).toContain("75/100");
    // Each row has an unwatch button.
    expect((html.match(/Unwatch/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("surfaces 'Never checked yet' for entries without a snapshot", () => {
    watchRepo({ owner: "torvalds", repo: "linux" });
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <WatchedDialog open={true} onClose={() => {}} onPick={() => {}} />
      </I18nProvider>,
    );
    expect(html).toContain("torvalds/linux");
    // Watching a repo without seeding sets lastCheckedAt to null,
    // so the entry should fall through to the neverChecked label.
    // (When seeded with a snapshot, lastCheckedAt is set instead.)
    expect(html).toContain("Never checked yet");
  });
});

// Silence happy-dom Worker shim warning if any sibling module touches it.
if (typeof (globalThis as { Worker?: unknown }).Worker === "undefined") {
  (globalThis as { Worker?: unknown }).Worker = vi.fn();
}
