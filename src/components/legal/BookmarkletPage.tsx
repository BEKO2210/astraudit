/**
 * <BookmarkletPage /> — Roadmap M3.6.
 *
 * Renders the `#/bookmarklet` route. Single-page explanation of
 * what the bookmarklet does, plus the draggable link itself. The
 * bookmarklet is the no-install fallback to the M3.2–M3.4 browser
 * extension: same audit URL, opened in a new tab.
 *
 * Pattern mirrors <ScopePage /> for layout (DocPage shell + nav),
 * but the body is JSX rather than Markdown because the draggable
 * <a href="javascript:…"> element can't safely live in a Markdown
 * source.
 */

import { DocPage } from "./DocPage";

const SITE_AUDIT_PREFIX = "https://beko2210.github.io/astraudit/#/audit/";

/**
 * The bookmarklet code itself. Kept readable here; the inlined
 * `BOOKMARKLET_HREF` below is the minified single-line form the
 * browser sees.
 *
 *   1. Verify hostname is github.com — otherwise the bookmarklet
 *      was activated on the wrong page and we tell the user.
 *   2. Match `/{owner}/{repo}` from the pathname.
 *   3. Reject reserved first-segment routes (`/settings`,
 *      `/marketplace`, `/explore`, …) so a click on the wrong page
 *      doesn't open a bogus audit URL.
 *   4. Trim a trailing `.git` from the repo slug if any.
 *   5. Open `https://beko2210.github.io/astraudit/#/audit/{owner}/{repo}`
 *      in a new tab with `noopener` for security.
 */
const BOOKMARKLET_HREF =
  "javascript:(function(){" +
  "var L=location;" +
  "if(L.hostname!=='github.com'){alert('Astraudit: open a github.com/owner/repo page first.');return;}" +
  "var m=L.pathname.match(/^\\/([^\\/]+)\\/([^\\/]+)/);" +
  "var r=['settings','marketplace','notifications','explore','features','about','pricing','sponsors','codespaces','issues','pulls','search','new','login','logout','users','organizations','orgs','topics','trending','collections','events','customer-stories','enterprise','site','support','watching','sessions','account','apps','community','contact','advisories','github-copilot'];" +
  "if(!m||r.indexOf(m[1])>-1){alert('Astraudit: navigate to github.com/owner/repo first.');return;}" +
  "var o=m[1],p=m[2].replace(/\\.git$/,'');" +
  "window.open('" +
  SITE_AUDIT_PREFIX +
  "'+encodeURIComponent(o)+'/'+encodeURIComponent(p),'_blank','noopener');" +
  "})();";

export function BookmarkletPage() {
  return (
    <DocPage
      title="Astraudit bookmarklet"
      backLabel="Back to app"
      nav={[
        { slug: "rules", label: "Rule book →" },
        { slug: "scope", label: "Scope →" },
      ]}
    >
      <p>
        The Astraudit bookmarklet is the no‑install fallback to the{" "}
        browser extension. Drag the button below into your browser's
        bookmarks bar. Then, on any{" "}
        <code>github.com/owner/repo</code> page, click the bookmark
        and Astraudit opens the audit in a new tab.
      </p>

      <p className="mb-2 mt-6 text-sm uppercase tracking-wider text-slate-400">
        Drag this to your bookmarks bar
      </p>

      {/*
        The href intentionally carries a `javascript:` URL — that is
        the entire point of a bookmarklet. React warns in dev but
        passes it through. Click-handler swallows the activation in
        case a user clicks instead of dragging (we tell them what to
        do rather than executing on this page).
      */}
      <a
        href={BOOKMARKLET_HREF}
        onClick={(e) => {
          e.preventDefault();
          alert(
            "Drag this button to your bookmarks bar instead of clicking it. Then visit github.com/owner/repo and click the saved bookmark.",
          );
        }}
        draggable
        className="inline-flex items-center gap-2 rounded-xl border border-aurora-violet/40 bg-aurora-violet/15 px-5 py-2.5 text-base font-medium text-aurora-violet shadow-lg shadow-aurora-violet/10 transition hover:border-aurora-violet/60 hover:bg-aurora-violet/25"
      >
        <span aria-hidden="true">📌</span>
        Audit this repo
      </a>

      <h2>How it works</h2>
      <ol>
        <li>
          You drag the button above onto your browser's bookmarks
          bar. The browser stores it as a normal bookmark whose URL
          starts with <code>javascript:</code>.
        </li>
        <li>
          On any <code>github.com/owner/repo</code> page, you click
          that bookmark. The script reads your current URL,
          extracts the owner + repo, and opens{" "}
          <code>{SITE_AUDIT_PREFIX}…/…</code> in a new tab.
        </li>
        <li>
          Astraudit fetches the repo's metadata, runs the audit, and
          renders the full dashboard — same engine as the website,
          same engine as the browser extension.
        </li>
      </ol>

      <h2>What it does not do</h2>
      <ul>
        <li>
          The bookmarklet does <strong>not</strong> read any data
          from the GitHub page itself — it only inspects the URL.
        </li>
        <li>
          It does <strong>not</strong> phone home, fingerprint your
          browser, or set cookies. The only thing it does is{" "}
          <code>window.open()</code>.
        </li>
        <li>
          It does <strong>not</strong> work on private repositories,
          because Astraudit doesn't audit private repositories
          (constraint contract — see the{" "}
          <a href="#/scope">scope page</a>).
        </li>
      </ul>

      <h2>Bookmarklet vs. extension</h2>
      <ul>
        <li>
          <strong>Extension:</strong> overlays a score pill directly
          on the GitHub page. Best for repeat use.
        </li>
        <li>
          <strong>Bookmarklet:</strong> opens the full audit in a
          new tab. Best for occasional use, on browsers without an
          extension store, or in private‑browsing windows.
        </li>
      </ul>

      <p>
        The full source of the bookmarklet is in{" "}
        <a
          href="https://github.com/BEKO2210/astraudit/blob/main/src/components/legal/BookmarkletPage.tsx"
          target="_blank"
          rel="noopener noreferrer"
        >
          src/components/legal/BookmarkletPage.tsx
        </a>
        . Inspect before you trust — that's the whole point of a
        bookmarklet vs. an installed extension.
      </p>
    </DocPage>
  );
}
