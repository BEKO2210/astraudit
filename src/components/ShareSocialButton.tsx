/**
 * <ShareSocialButton /> — Roadmap M8.3.
 *
 * Sticky-bar dropdown that opens the four supported networks
 * (Twitter / Mastodon / Bluesky / LinkedIn) pre-composed with
 * the audit's score + grade + link. Each entry has two affordances:
 *   • Open intent URL — pops the platform's compose box
 *   • Copy text       — drops the pre-formatted body into the
 *                       clipboard for any other client (Threads,
 *                       Slack, an email, etc.)
 *
 * No telemetry, no third-party fetches.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AtSign,
  Cloud,
  Copy,
  ExternalLink,
  Hash,
  Megaphone,
  Send,
} from "lucide-react";
import type { AuditResult } from "../types/audit";
import {
  renderAllSocialPosts,
  type SocialPlatform,
  type SocialPost,
} from "../lib/share/socialPost";
import { pushToast } from "../lib/ui/toastStore";
import { useTranslation } from "../lib/i18n";

interface ShareSocialButtonProps {
  result: AuditResult;
}

// Generic icons — lucide-react@1 dropped every brand glyph; we
// pick semantically-close fallbacks (the visible label carries
// the brand name anyway).
const ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  twitter: Hash,
  mastodon: AtSign,
  bluesky: Cloud,
  linkedin: Send,
};

const LABELS: Record<SocialPlatform, string> = {
  twitter: "X / Twitter",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
  linkedin: "LinkedIn",
};

function buildAuditUrl(fullName: string): string {
  if (typeof window === "undefined") {
    return `https://beko2210.github.io/astraudit/#/audit/${fullName}`;
  }
  const url = new URL(window.location.href);
  url.hash = `#/audit/${fullName}`;
  return url.toString();
}

export function ShareSocialButton({ result }: ShareSocialButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const posts: SocialPost[] = renderAllSocialPosts({
    fullName: result.bundle.metadata.fullName,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    grade: result.grade,
    verdict: result.headline || result.verdict,
    auditUrl: buildAuditUrl(result.bundle.metadata.fullName),
    repoUrl: result.bundle.metadata.htmlUrl,
  });

  const copyText = useCallback(
    async (post: SocialPost) => {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(post.text);
          pushToast({
            tone: "success",
            message: t("share.copiedToast"),
          });
        } catch {
          pushToast({ tone: "error", message: t("share.copyFailedToast") });
        }
      } else {
        pushToast({ tone: "error", message: t("share.copyFailedToast") });
      }
      setOpen(false);
    },
    [t],
  );

  const openIntent = useCallback((post: SocialPost) => {
    if (!post.intentUrl) return;
    if (typeof window !== "undefined") {
      window.open(post.intentUrl, "_blank", "noopener,noreferrer");
    }
    setOpen(false);
  }, []);

  return (
    <div ref={wrapRef} className="relative inline-flex print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("share.menuAria")}
        className="inline-flex min-h-[1.625rem] items-center gap-1.5 rounded-full border border-aurora-cyan/40 bg-aurora-cyan/10 px-2.5 py-1 text-[11px] font-medium text-aurora-cyan transition hover:bg-aurora-cyan/20"
      >
        <Megaphone className="h-3 w-3" />
        {t("share.label")}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={t("share.menuAria")}
          className="absolute right-0 top-full z-30 mt-1 min-w-[18rem] overflow-hidden rounded-lg border border-white/10 bg-ink-900/95 p-1 text-sm shadow-glow backdrop-blur"
        >
          {posts.map((post) => {
            const Icon = ICONS[post.platform];
            return (
              <div
                key={post.platform}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-white/[0.03]"
              >
                <div className="flex flex-1 items-center gap-2 text-slate-200">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 truncate text-[12px]">
                    {LABELS[post.platform]}
                  </span>
                  {post.limit ? (
                    <span className="font-mono text-[10px] text-slate-500">
                      {post.length}/{post.limit}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => copyText(post)}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/[0.06]"
                  aria-label={`${t("share.copyAria")} — ${LABELS[post.platform]}`}
                >
                  <Copy className="inline h-3 w-3" />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openIntent(post)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-aurora-cyan hover:bg-white/[0.06]"
                  aria-label={`${t("share.openAria")} — ${LABELS[post.platform]}`}
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("share.open")}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
