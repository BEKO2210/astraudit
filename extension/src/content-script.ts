/**
 * Astraudit content script — Roadmap M3.2 (skeleton).
 *
 * Runs on every github.com page (declared in manifest as
 * `matches: ["https://github.com/*"]`). M3.2's job is purely to
 * confirm injection works; the score-overlay UI lands in M3.3.
 *
 * What this version does:
 *   1. Decide whether the current URL is a public repo page —
 *      `github.com/{owner}/{repo}[/...]` AND owner/repo aren't
 *      reserved GitHub paths.
 *   2. Drop a hidden marker `<div data-astraudit-injected>` onto
 *      the document so M3.3's UI work has something to assert
 *      against in tests.
 *   3. Log a one-line debug message visible in the page console.
 *
 * Deliberately does NOT yet:
 *   - import the audit engine (M3.3)
 *   - make any network call (M3.3)
 *   - render visible UI (M3.3)
 *   - talk to the service worker (M3.3)
 *
 * Keeping M3.2 boring means M3.3 reviewers can focus on UI choices,
 * not "why is this firing at all".
 */

// GitHub reserves the first path segment for app/system routes
// like `/settings`, `/notifications`, `/marketplace`. The second
// segment can also be reserved (`/{owner}/community`,
// `/{owner}/.github`-fallback, etc.) but for "is this a repo page?"
// detection, gating on the first segment is enough — every reserved
// app route is one segment deep, and a true `/owner/repo` URL has
// at least two non-reserved segments.
const RESERVED_FIRST_SEGMENTS = new Set([
  "",
  "about",
  "account",
  "advisories",
  "apps",
  "codespaces",
  "collections",
  "community",
  "contact",
  "customer-stories",
  "discussions",
  "enterprise",
  "events",
  "explore",
  "features",
  "github-copilot",
  "issues",
  "login",
  "logout",
  "marketplace",
  "new",
  "notifications",
  "organizations",
  "orgs",
  "pricing",
  "pulls",
  "search",
  "security",
  "sessions",
  "settings",
  "site",
  "sponsors",
  "support",
  "topics",
  "trending",
  "users",
  "watching",
]);

interface RepoLocation {
  owner: string;
  repo: string;
}

function detectRepoLocation(pathname: string): RepoLocation | null {
  const segs = pathname.split("/").filter((s) => s.length > 0);
  if (segs.length < 2) return null;
  const [owner, repo] = segs;
  if (RESERVED_FIRST_SEGMENTS.has(owner)) return null;
  // GitHub repository names can't end with `.git` in the URL form,
  // and the deep paths (`/blame`, `/blob`, `/issues`, …) come from
  // the third segment onward — which we don't care about for now.
  if (repo === ".git" || repo.endsWith(".git")) return null;
  return { owner, repo };
}

function markInjected(location: RepoLocation | null): void {
  // Idempotent: rerunning the content script (e.g. after a turbo
  // SPA-style nav inside GitHub) overwrites the marker rather than
  // stacking duplicates.
  const existing = document.querySelector("[data-astraudit-injected]");
  if (existing) existing.remove();

  const marker = document.createElement("div");
  marker.setAttribute("data-astraudit-injected", "v0.1.0");
  marker.setAttribute("data-astraudit-on-repo", location ? "true" : "false");
  if (location) {
    marker.setAttribute("data-astraudit-owner", location.owner);
    marker.setAttribute("data-astraudit-repo", location.repo);
  }
  // The marker is hidden from layout — no chrome, no aria — purely
  // a hook for M3.3's UI mount + future end-to-end tests.
  marker.style.display = "none";
  marker.setAttribute("aria-hidden", "true");
  document.documentElement.appendChild(marker);
}

function main(): void {
  const location = detectRepoLocation(window.location.pathname);
  markInjected(location);
  if (location) {
    console.debug(
      `[Astraudit] content script ready on ${location.owner}/${location.repo}`,
    );
  } else {
    console.debug(
      `[Astraudit] content script ready (not a repo page: ${window.location.pathname})`,
    );
  }
}

// GitHub uses turbo-style soft navigations; re-run detection on
// every URL change so a click from `/explore` → `/facebook/react`
// re-evaluates without a full page reload. `popstate` covers
// back/forward; a polyfilled `pushState` observer covers the rest.
const originalPushState = history.pushState.bind(history);
history.pushState = function patched(...args) {
  const result = originalPushState(...args);
  // Defer so the URL has actually settled before we re-detect.
  queueMicrotask(main);
  return result;
};
window.addEventListener("popstate", () => queueMicrotask(main));

main();

export {};
