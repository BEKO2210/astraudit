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
# → dist-extension/manifest.json
# → dist-extension/service-worker.js   (ESM, ~1 KB)
# → dist-extension/content-script.js   (IIFE, ~2 KB)
# → dist-extension/icons/{16,48,128}.png
# → dist-extension/astraudit-extension.zip  (store upload)
```

## Load unpacked (Chrome / Edge / Brave / Arc)

1. `chrome://extensions` → toggle *Developer mode* on.
2. *Load unpacked* → select `dist-extension/`.
3. Open any GitHub repo page (e.g. `github.com/facebook/react`).
4. Open the page's DevTools console — you should see
   `[Astraudit] content script ready on facebook/react`.
5. Open the extension's *Inspect views: service worker* link to
   verify the SW logs `service worker installed: install` (first
   load) or `update` (subsequent reloads).

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
