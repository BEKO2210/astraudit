import { ExternalLink, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import {
  renderReadmeMarkdown,
  truncateMarkdown,
} from "../lib/markdown/render";

interface ReadmePreviewProps {
  content: string;
  owner: string;
  repo: string;
  branch: string;
  htmlUrl: string;
}

const SOFT_CAP = 1800;
const EXPANDED_CAP = 8000;

export function ReadmePreview({
  content,
  owner,
  repo,
  branch,
  htmlUrl,
}: ReadmePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const cap = expanded ? EXPANDED_CAP : SOFT_CAP;

  const { html, isTruncated } = useMemo(() => {
    const { content: source, truncated } = truncateMarkdown(content, cap);
    const html = renderReadmeMarkdown(source, { owner, repo, branch });
    return { html, isTruncated: truncated };
  }, [content, cap, owner, repo, branch]);

  if (!content || !content.trim()) return null;

  return (
    <section className="glass overflow-hidden p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-aurora-cyan" />
          <h3 className="text-sm font-semibold text-white">README preview</h3>
        </div>
        <div className="flex items-center gap-2">
          {isTruncated || expanded ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/[0.06]"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
          <a
            href={`${htmlUrl}#readme`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-aurora-cyan hover:bg-white/[0.06]"
          >
            View full README
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>
      <p className="mt-1 text-[11px] text-slate-500">
        Rendered safely · markdown only · external HTML and scripts are
        ignored. Relative links resolve to{" "}
        <code className="font-mono">github.com/{owner}/{repo}</code>.
      </p>
      <div
        className="readme-prose mt-4 max-h-[640px] overflow-y-auto pr-2 scrollbar-thin"
        // The HTML comes from markdown-it configured with `html: false`,
        // so any inline HTML in the source is rendered as escaped text.
        // Links + images are post-processed to add target/rel attrs and
        // resolved against the repo's branch. See lib/markdown/render.ts.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
