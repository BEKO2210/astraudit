# Astraudit · MV3 browser extension

> **Status.** Roadmap M3.2 (skeleton). Ships an MV3 manifest, a
> service worker that wires the toolbar click, and a content script
> that detects whether the current GitHub page is a public repo +
> drops a hidden marker the M3.3 UI work mounts against. No visible
> score‑overlay yet — that's M3.3.

---

## Layout

```
extension/
├── README.md            ← this file
├── manifest.json        ← MV3 manifest (background, content_scripts,
│                          action, host_permissions)
├── icons/               ← icon-16.png / icon-48.png / icon-128.png
│                          (maintainer adds real icons; build-extension
│                          drops 1×1 placeholders if missing)
└── src/
    ├── service-worker.ts ← ESM, MV3 background
    └── content-script.ts ← IIFE, injected on github.com/*
```

Output bundle lives in `dist-extension/` (gitignored, regenerated
via `npm run build:ext`).

## Build

```bash
npm run build:ext
# → dist-extension/chrome/         + chrome.zip
# → dist-extension/firefox/        + firefox.zip
# → dist-extension/safari-source/  (input for the macOS converter)
```

One source tree, three per‑browser fan‑outs. Bundles + icons are
byte‑identical across the three; only `manifest.json` differs
(Firefox adds `browser_specific_settings.gecko`; Chrome strips
it; Safari uses the Chrome shape because the converter ingests
that layout).

## Load unpacked

### Chrome / Edge / Brave / Arc (M3.4)

1. `chrome://extensions` → toggle *Developer mode* on.
2. *Load unpacked* → select `dist-extension/chrome/`.
3. Open any GitHub repo page (e.g. `github.com/facebook/react`).
4. Open the page's DevTools console — you should see
   `[Astraudit] content script ready on facebook/react`.
5. Open the extension's *Inspect views: service worker* link to
   verify the SW logs `service worker installed: install` (first
   load) or `update` (subsequent reloads).

### Firefox 128+ (M3.4)

1. `about:debugging` → *This Firefox* → *Load Temporary Add‑on*.
2. Select `dist-extension/firefox/manifest.json`.
3. Same DevTools verification as Chrome above. Temporary add‑ons
   reload on every Firefox restart; signed `.xpi` (AMO upload) is
   the long‑term path.

### Safari 17+ (M3.4 source / M3.5 store submission)

The Safari toolchain is **macOS‑only** and requires Xcode 16+.
The repo's build script only prepares the *source* directory; the
actual conversion is a maintainer step:

```bash
xcrun safari-web-extension-converter \
  dist-extension/safari-source \
  --bundle-identifier io.github.beko2210.astraudit \
  --no-prompt --force
```

The converter spits out an Xcode project; building it produces a
Safari App Extension wrapper that can be sideloaded via the
*Develop* menu or submitted to the App Store via App Store
Connect.

## What this version does

- ✓ Decides whether the page URL is a public repo
  (`github.com/{owner}/{repo}[/...]`) and not a reserved GitHub
  path (`/settings`, `/marketplace`, `/notifications`, …).
- ✓ Drops a hidden DOM marker
  `<div data-astraudit-injected="0.1.0" data-astraudit-on-repo="true"
  data-astraudit-owner="…" data-astraudit-repo="…" />` for M3.3's
  UI mount + future end‑to‑end tests.
- ✓ Re‑evaluates on GitHub's turbo‑style soft nav (clicking
  `/explore → /facebook/react` doesn't need a hard reload).
- ✓ Toolbar click opens or focuses a single Astraudit site tab.

## What this version deliberately doesn't do

- ✗ No score overlay (M3.3).
- ✗ No audit engine import (M3.3 imports `dist-audit-lib`).
- ✗ No network call from the extension itself (M3.3).
- ✗ No SW ↔ content‑script messaging (M3.3).
- ✗ No Firefox / Safari packaging (M3.4).
- ✗ Not in any store (M3.5).

Keeping M3.2 boring means M3.3 reviewers can focus on UI design
choices, not "why is this code firing at all".

## Permissions

- `host_permissions: ["https://github.com/*", "https://api.github.com/*"]`
  — the content script reads page URL; M3.3 will use the API host
  for audit fetches initiated from the service worker.
- No `tabs`, `storage`, `cookies`, `webRequest`, `scripting`,
  `activeTab`, `notifications`, or anything else. The minimal
  permission set is the marketing claim — keep it that way.

## Browser support targets

- Chrome ≥ 122 (MV3 stable)
- Edge ≥ 122
- Brave + Arc (Chromium‑family, no extra config)
- Firefox ≥ 128 (MV3 stable) — packaging via `web-ext` in M3.4
- Safari ≥ 17 — via `safari-web-extension-converter` in M3.4
