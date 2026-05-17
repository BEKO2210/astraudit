# Astraudit · Press Kit

Everything press, podcasts, newsletters and OSS‑awesome lists need to
cover Astraudit. Reproduce freely under the project's MIT license —
attribution welcomed, not required.

- **Live site:** https://beko2210.github.io/astraudit/
- **Repository:** https://github.com/BEKO2210/astraudit
- **Maintainer:** [@BEKO2210](https://github.com/BEKO2210)
- **License:** MIT (code, copy, assets in this folder)

---

## What's in this folder

| File | Purpose |
|---|---|
| `README.md` | This index — start here. |
| `PRESS_RELEASE.md` | Short release the way a newsroom would run it. ~300 words. |
| `one-pager.md` | Single‑page positioning + key facts + links. Drop straight into a pitch deck. |

## Reusable assets that live elsewhere in this repo

(Kept in their canonical locations to avoid double‑maintenance. Hot‑link
or copy as needed.)

| Asset | Path | Notes |
|---|---|---|
| Logo (PNG, background removed) | [`public/Logo_bg_removed.png`](../Logo_bg_removed.png) | 512×512, transparent BG. |
| Logo (WebP, background removed) | [`public/Logo_bg_removed.webp`](../Logo_bg_removed.webp) | Smaller, modern browsers. |
| OG / social card | [`public/og-card.png`](../og-card.png) | 1200×630, ready for Twitter / OG. |
| Desktop screenshot — dark | [`docs/readme/desktop-dark.png`](../../docs/readme/desktop-dark.png) | Dashboard, dark theme. |
| Desktop screenshot — light | [`docs/readme/desktop-light.png`](../../docs/readme/desktop-light.png) | Dashboard, light theme. |
| Desktop screenshot — audit graph | [`docs/readme/desktop-graph-dark.png`](../../docs/readme/desktop-graph-dark.png) | Interactive React Flow audit map. |
| Desktop screenshot — export menu | [`docs/readme/desktop-export.png`](../../docs/readme/desktop-export.png) | Markdown / JSON / AsciiDoc export menu. |
| Mobile screenshot — dark | [`docs/readme/mobile-dark.png`](../../docs/readme/mobile-dark.png) | iPhone 14 Pro viewport, dark. |
| Mobile screenshot — light | [`docs/readme/mobile-light.png`](../../docs/readme/mobile-light.png) | iPhone 14 Pro viewport, light. |
| Pipeline diagram (SVG) | [`docs/readme/pipeline.svg`](../../docs/readme/pipeline.svg) | The audit data‑flow, single image. |

## Coming in a follow‑up press‑kit PR

- 1280×720 wide screenshots for each of the seven main panels.
- 60‑second screencast (`.mp4` + transcript `.vtt`).
- One‑page PDF rendered from `one-pager.md`.

The maintainer adds the screencast manually; the screenshots are
automated via a Playwright capture script.

## Brand notes

- Use the logo as shipped — don't recolour, drop shadow, or warp it.
- The brand colour ramp lives in `tailwind.config.ts` (`aurora-*`).
  If you need swatches, the README's headline uses `aurora-violet`
  (#7a5cff).
- Project name is **Astraudit**, one word, capital A. Pronounced
  "AH‑stra‑audit".

## Contact

For coverage, podcast invites, talk pitches or anything else, open a
[GitHub Discussion](https://github.com/BEKO2210/astraudit/discussions)
or DM the maintainer via the contact addresses on their GitHub
profile. The maintainer typically responds within 48 h.
