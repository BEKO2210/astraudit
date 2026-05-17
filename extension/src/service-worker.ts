/**
 * Astraudit MV3 service worker — Roadmap M3.2.
 *
 * MV3 service workers are event-driven: the browser starts them on
 * an event, runs the handler, and tears the worker down again when
 * idle. We can't hold long-lived state in module scope — every
 * handler must assume cold start.
 *
 * For M3.2 (skeleton) the worker:
 *   - logs install + update events so the maintainer can confirm
 *     a fresh install in the browser's "Extensions → Inspect views"
 *     console without any UI plumbing yet,
 *   - wires the toolbar action to open the Astraudit site as a
 *     pinned tab so a click does *something* visible from day one.
 *
 * M3.3 will graduate this into:
 *   - a `chrome.runtime.onMessage` handler that the content script
 *     uses to request audit runs (so the heavy audit lib stays out
 *     of the page's content-script CSP),
 *   - per-origin badge updates with the audited score.
 */

const SITE_ORIGIN = "https://beko2210.github.io/astraudit/";

chrome.runtime.onInstalled.addListener((details) => {
  // `install` (fresh install), `update` (extension version bumped),
  // `chrome_update` (browser updated under us) — log each so the
  // M3.5 store-submission troubleshooting has breadcrumbs.
  console.log("[Astraudit] service worker installed:", details.reason);
});

chrome.runtime.onStartup?.addListener(() => {
  // Fires once per browser session. Useful for any session-scoped
  // cleanup the extension picks up later (cache pruning, etc.).
  console.log("[Astraudit] browser session started");
});

chrome.action.onClicked.addListener(async () => {
  // Toolbar click → open / focus a single Astraudit tab. Re-using
  // the existing tab if any avoids opening multiple copies when a
  // user clicks the icon several times.
  const existing = await chrome.tabs.query({ url: `${SITE_ORIGIN}*` });
  if (existing.length > 0 && existing[0].id != null) {
    await chrome.tabs.update(existing[0].id, { active: true });
    if (existing[0].windowId != null) {
      await chrome.windows.update(existing[0].windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url: SITE_ORIGIN });
});

export {};
