/**
 * Astraudit content script — Roadmap M3.2 (skeleton) + M3.3
 * (score overlay UI).
 *
 * Runs on every github.com page. When the URL is a public repo,
 * mounts a fixed-position pill in the top-right of the viewport
 * showing the audit score + grade. The pill is the entry point to
 * a tooltip card listing the three highest-severity findings and a
 * "Open full audit" CTA.
 *
 * Architecture:
 *   - This script lives in the page's *isolated world* — same DOM,
 *     separate JS heap. It can't safely import the audit engine
 *     (CSP rules differ per repo's `Content-Security-Policy`
 *     headers), so the heavy lifting routes through the service
 *     worker via chrome.runtime.sendMessage. The SW owns the
 *     network calls; this script owns the DOM.
 *   - All styling is inline. Adding a stylesheet via `<link>` would
 *     fight every GitHub `<style>` block + risk Content-Security-
 *     Policy rejections. Inline styles win in CSP-strict pages.
 *
 * Re-evaluates on GitHub's turbo-style soft nav so a click from
 * `/explore` → `/facebook/react` re-mounts without a full reload.
 */

import type { AuditRequest, AuditResponse, TopFinding } from "./lib/messages";

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
  if (repo === ".git" || repo.endsWith(".git")) return null;
  return { owner, repo };
}

// --- Pill mounting ---------------------------------------------------------

const ROOT_ID = "astraudit-overlay-root";
const STYLE_ID = "astraudit-overlay-styles";

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  // Scoped via `#astraudit-overlay-root` so we can't accidentally
  // leak rules into GitHub's own stylesheets.
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      top: 70px;
      right: 16px;
      z-index: 2147483000;
      font: 13px/1.3 -apple-system, "Segoe UI", system-ui, sans-serif;
      color: #f1f4ff;
    }
    #${ROOT_ID} .astraudit-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px 6px 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, #1a1530 0%, #2a2150 100%);
      border: 1px solid rgba(122, 92, 255, 0.45);
      box-shadow: 0 6px 24px rgba(0,0,0,0.32),
                  0 0 0 1px rgba(255,255,255,0.04) inset;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease;
      user-select: none;
    }
    #${ROOT_ID} .astraudit-pill:hover,
    #${ROOT_ID} .astraudit-pill:focus-visible {
      outline: none;
      transform: translateY(-1px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.42),
                  0 0 0 1px rgba(122,92,255,0.55) inset;
    }
    #${ROOT_ID} .astraudit-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #42e8c8;
      box-shadow: 0 0 6px rgba(66,232,200,0.7);
    }
    #${ROOT_ID} .astraudit-dot.loading {
      background: #ffb547;
      animation: astraudit-pulse 1.2s ease-in-out infinite;
    }
    #${ROOT_ID} .astraudit-dot.error { background: #ff7a90; }
    @keyframes astraudit-pulse {
      0%,100% { opacity: 0.5; }
      50%     { opacity: 1; }
    }
    #${ROOT_ID} .astraudit-score {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
    }
    #${ROOT_ID} .astraudit-grade {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(122,92,255,0.25);
      color: #d6cdff;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    #${ROOT_ID} .astraudit-tip {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 320px;
      padding: 12px;
      background: #0c0f1a;
      border: 1px solid rgba(122,92,255,0.4);
      border-radius: 10px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity .12s ease;
    }
    #${ROOT_ID} .astraudit-tip[data-open="true"] {
      opacity: 1;
      pointer-events: auto;
    }
    #${ROOT_ID} .astraudit-tip-title {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9aa3c2;
      margin-bottom: 8px;
    }
    #${ROOT_ID} .astraudit-tip ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #${ROOT_ID} .astraudit-tip li {
      display: grid;
      grid-template-columns: 16px 1fr;
      gap: 8px;
      align-items: start;
      font-size: 12.5px;
      line-height: 1.35;
    }
    #${ROOT_ID} .astraudit-sev {
      width: 10px; height: 10px; border-radius: 2px; margin-top: 4px;
    }
    #${ROOT_ID} .astraudit-sev-critical { background: #ff4d6d; }
    #${ROOT_ID} .astraudit-sev-high     { background: #ff7a48; }
    #${ROOT_ID} .astraudit-sev-medium   { background: #ffb547; }
    #${ROOT_ID} .astraudit-sev-low      { background: #7ad0ff; }
    #${ROOT_ID} .astraudit-sev-info     { background: #9aa3c2; }
    #${ROOT_ID} .astraudit-cta {
      display: block;
      margin-top: 12px;
      padding: 8px 10px;
      text-align: center;
      background: #7a5cff;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 12.5px;
    }
    #${ROOT_ID} .astraudit-cta:hover { background: #8a6cff; }
    #${ROOT_ID} .astraudit-empty {
      font-size: 12.5px; color: #9aa3c2; padding: 6px 0;
    }
    #${ROOT_ID} .astraudit-error {
      font-size: 12.5px; color: #ffd6dc; padding: 4px 0 8px;
    }
  `;
  document.documentElement.appendChild(style);
}

interface Overlay {
  root: HTMLDivElement;
  pill: HTMLButtonElement;
  pillLabel: HTMLSpanElement;
  pillGrade: HTMLSpanElement;
  pillDot: HTMLSpanElement;
  tip: HTMLDivElement;
  tipBody: HTMLDivElement;
  destroy: () => void;
}

function severityClass(s: TopFinding["severity"]): string {
  return `astraudit-sev astraudit-sev-${s}`;
}

function createOverlay(location: RepoLocation): Overlay {
  injectStyles();

  // Remove any previous overlay (idempotent on turbo soft-nav).
  document.getElementById(ROOT_ID)?.remove();

  const root = document.createElement("div");
  root.id = ROOT_ID;

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "astraudit-pill";
  pill.setAttribute(
    "aria-label",
    `Astraudit score for ${location.owner}/${location.repo}, loading`,
  );

  const pillDot = document.createElement("span");
  pillDot.className = "astraudit-dot loading";

  const pillLabel = document.createElement("span");
  pillLabel.className = "astraudit-score";
  pillLabel.textContent = "—";

  const pillGrade = document.createElement("span");
  pillGrade.className = "astraudit-grade";
  pillGrade.textContent = "…";

  pill.append(pillDot, pillLabel, pillGrade);

  const tip = document.createElement("div");
  tip.className = "astraudit-tip";
  tip.setAttribute("role", "tooltip");
  tip.dataset.open = "false";

  const tipBody = document.createElement("div");
  tip.appendChild(tipBody);

  root.append(pill, tip);
  document.documentElement.appendChild(root);

  let open = false;
  const setOpen = (next: boolean) => {
    open = next;
    tip.dataset.open = next ? "true" : "false";
  };

  pill.addEventListener("click", () => setOpen(!open));
  pill.addEventListener("focus", () => setOpen(true));
  pill.addEventListener("mouseenter", () => setOpen(true));

  const docClick = (e: MouseEvent) => {
    if (!root.contains(e.target as Node)) setOpen(false);
  };
  const docKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };
  document.addEventListener("click", docClick);
  document.addEventListener("keydown", docKey);

  const destroy = () => {
    document.removeEventListener("click", docClick);
    document.removeEventListener("keydown", docKey);
    root.remove();
  };

  return { root, pill, pillLabel, pillGrade, pillDot, tip, tipBody, destroy };
}

function renderLoading(o: Overlay): void {
  o.pillDot.className = "astraudit-dot loading";
  o.pillLabel.textContent = "—";
  o.pillGrade.textContent = "…";
  o.tipBody.innerHTML = "";
  const title = document.createElement("div");
  title.className = "astraudit-tip-title";
  title.textContent = "Auditing…";
  const empty = document.createElement("div");
  empty.className = "astraudit-empty";
  empty.textContent = "Fetching repo metadata + running 70 detectors…";
  o.tipBody.append(title, empty);
}

function renderSuccess(
  o: Overlay,
  location: RepoLocation,
  res: Extract<AuditResponse, { ok: true }>,
): void {
  o.pillDot.className = "astraudit-dot";
  o.pillLabel.textContent = `${res.score}/${res.max}`;
  o.pillGrade.textContent = res.grade;
  o.pill.setAttribute(
    "aria-label",
    `Astraudit score ${res.score} out of ${res.max} (grade ${res.grade}) for ${location.owner}/${location.repo}. ${res.verdict}`,
  );

  o.tipBody.innerHTML = "";
  const title = document.createElement("div");
  title.className = "astraudit-tip-title";
  title.textContent = `Top findings · ${res.verdict}`;
  o.tipBody.appendChild(title);

  if (res.topFindings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "astraudit-empty";
    empty.textContent = "No active findings — strong baseline.";
    o.tipBody.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    for (const finding of res.topFindings) {
      const li = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = severityClass(finding.severity);
      dot.setAttribute("aria-label", `${finding.severity} severity`);
      const text = document.createElement("span");
      text.textContent = finding.title;
      li.append(dot, text);
      list.appendChild(li);
    }
    o.tipBody.appendChild(list);
  }

  const cta = document.createElement("a");
  cta.className = "astraudit-cta";
  cta.href = res.auditUrl;
  cta.target = "_blank";
  cta.rel = "noopener noreferrer";
  cta.textContent = "Open full audit →";
  o.tipBody.appendChild(cta);
}

function renderError(
  o: Overlay,
  location: RepoLocation,
  res: Extract<AuditResponse, { ok: false }>,
): void {
  o.pillDot.className = "astraudit-dot error";
  o.pillLabel.textContent = "—";
  o.pillGrade.textContent =
    res.reason === "rate-limit"
      ? "WAIT"
      : res.reason === "not-found"
        ? "404"
        : res.reason === "invalid-token"
          ? "AUTH"
          : "ERR";
  o.pill.setAttribute(
    "aria-label",
    `Astraudit could not audit ${location.owner}/${location.repo}: ${res.message}`,
  );

  o.tipBody.innerHTML = "";
  const title = document.createElement("div");
  title.className = "astraudit-tip-title";
  title.textContent =
    res.reason === "rate-limit"
      ? "Rate limit reached"
      : res.reason === "not-found"
        ? "Repo not accessible"
        : res.reason === "invalid-token"
          ? "Token invalid"
          : "Audit failed";
  const msg = document.createElement("div");
  msg.className = "astraudit-error";
  msg.textContent =
    res.reason === "rate-limit" && res.resetIn != null
      ? `GitHub rate-limit hit. Resets in ~${Math.ceil(res.resetIn / 60)} min.`
      : res.message;
  o.tipBody.append(title, msg);

  // Even on error, keep the CTA so the user can still open the
  // full Astraudit site for a manual look (the site supports its
  // own PAT for higher rate limits).
  const cta = document.createElement("a");
  cta.className = "astraudit-cta";
  cta.href = `https://beko2210.github.io/astraudit/#/audit/${location.owner}/${location.repo}`;
  cta.target = "_blank";
  cta.rel = "noopener noreferrer";
  cta.textContent = "Try on Astraudit site →";
  o.tipBody.appendChild(cta);
}

async function runAuditFlow(location: RepoLocation): Promise<void> {
  const overlay = createOverlay(location);
  renderLoading(overlay);

  const req: AuditRequest = {
    type: "audit",
    owner: location.owner,
    repo: location.repo,
  };
  try {
    const res = (await chrome.runtime.sendMessage(req)) as AuditResponse;
    if (res?.ok === true) {
      renderSuccess(overlay, location, res);
    } else if (res?.ok === false) {
      renderError(overlay, location, res);
    } else {
      renderError(overlay, location, {
        ok: false,
        reason: "other",
        message: "Unexpected response shape from extension service worker.",
      });
    }
  } catch (err) {
    renderError(overlay, location, {
      ok: false,
      reason: "other",
      message: (err as Error)?.message ?? "Service worker not reachable",
    });
  }
}

// --- Marker (kept from M3.2 for tests + diagnostic) ----------------------

const MARKER_ID = "astraudit-injected-marker";

function markInjected(location: RepoLocation | null): void {
  document.getElementById(MARKER_ID)?.remove();
  const marker = document.createElement("div");
  marker.id = MARKER_ID;
  marker.setAttribute("data-astraudit-injected", "0.1.0");
  marker.setAttribute("data-astraudit-on-repo", location ? "true" : "false");
  if (location) {
    marker.setAttribute("data-astraudit-owner", location.owner);
    marker.setAttribute("data-astraudit-repo", location.repo);
  }
  marker.style.display = "none";
  marker.setAttribute("aria-hidden", "true");
  document.documentElement.appendChild(marker);
}

function main(): void {
  const location = detectRepoLocation(window.location.pathname);
  markInjected(location);
  if (!location) {
    document.getElementById(ROOT_ID)?.remove();
    console.debug(
      `[Astraudit] not a repo page: ${window.location.pathname}`,
    );
    return;
  }
  console.debug(
    `[Astraudit] mounting overlay for ${location.owner}/${location.repo}`,
  );
  void runAuditFlow(location);
}

// GitHub uses turbo-style soft navigations; re-mount on URL change.
const originalPushState = history.pushState.bind(history);
history.pushState = function patched(...args) {
  const result = originalPushState(...args);
  queueMicrotask(main);
  return result;
};
window.addEventListener("popstate", () => queueMicrotask(main));

main();

export {};
