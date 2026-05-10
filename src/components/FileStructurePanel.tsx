import { FileCheck2, FileWarning, FolderTree, Hash } from "lucide-react";
import type { FileStructureSummary } from "../types/audit";

interface FileStructurePanelProps {
  structure: FileStructureSummary;
}

export function FileStructurePanel({ structure }: FileStructurePanelProps) {
  const missingShown = structure.importantFilesMissing.slice(0, 14);

  return (
    <section className="glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-aurora-blue" />
          <h3 className="text-sm font-semibold text-white">
            File structure intelligence
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Hash className="h-3 w-3" /> {structure.totalFiles} files mapped
          </span>
          <span>{structure.rootFileCount} root files</span>
          {structure.treeTruncated ? (
            <span className="text-risk-medium">Tree truncated by GitHub</span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="card-title">Important files present</h4>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {structure.importantFilesPresent.length === 0 ? (
              <li className="text-sm text-slate-500">None detected.</li>
            ) : (
              structure.importantFilesPresent.map((file) => (
                <li
                  key={file}
                  className="flex items-center gap-2 overflow-hidden rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 text-xs"
                >
                  <FileCheck2 className="h-3 w-3 shrink-0 text-aurora-mint" />
                  <code className="min-w-0 flex-1 truncate font-mono text-slate-200">{file}</code>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h4 className="card-title">Notable missing files</h4>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {missingShown.map((file) => (
              <li
                key={file}
                className="flex items-center gap-2 overflow-hidden rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 text-xs"
              >
                <FileWarning className="h-3 w-3 shrink-0 text-risk-medium" />
                <code className="min-w-0 flex-1 truncate font-mono text-slate-300">{file}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="card-title">Recognized folders</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {structure.importantFolders.length === 0 ? (
              <span className="text-sm text-slate-500">None detected.</span>
            ) : (
              structure.importantFolders.map((folder) => (
                <span key={folder} className="pill text-slate-200">
                  {folder}/
                </span>
              ))
            )}
          </div>
        </div>
        <div>
          <h4 className="card-title text-risk-medium">
            Suspicious filenames (filename match only)
          </h4>
          {structure.suspiciousFiles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">None detected.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {structure.suspiciousFiles.slice(0, 10).map((file) => (
                <li key={file} className="text-xs text-slate-300">
                  <code className="break-all font-mono">{file}</code>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            Filename match only. Astraudit never reads file contents to detect
            secrets.
          </p>
        </div>
      </div>
    </section>
  );
}
