import { BookOpen } from "lucide-react";
import type { RepoStorySection } from "../types/audit";

interface RepoStoryProps {
  story: RepoStorySection[];
}

export function RepoStory({ story }: RepoStoryProps) {
  return (
    <section className="glass p-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-aurora-cyan" />
        <h3 className="text-sm font-semibold text-white">Repository story</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Generated from public metadata, files, and structure. No AI inference.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {story.map((section) => (
          <div
            key={section.heading}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
          >
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {section.heading}
            </h4>
            <p className="mt-2 text-sm text-slate-200/90">{section.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
