import { FileCheck2, FileWarning, FolderTree, Hash } from "lucide-react";
import type { FileStructureSummary } from "../types/audit";
import { useTranslation } from "../lib/i18n";
import { CopyButton } from "./CopyButton";

interface FileStructurePanelProps {
  structure: FileStructureSummary;
}

export function FileStructurePanel({ structure }: FileStructurePanelProps) {
  const { t } = useTranslation();
  const missingShown = structure.importantFilesMissing.slice(0, 14);

  return (
    <section className="glass p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-aurora-blue" />
          <h3 className="text-sm font-semibold text-white">
            {t("fileTree.heading")}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Hash className="h-3 w-3" /> {structure.totalFiles}{" "}
            {t("fileTree.filesMappedSuffix")}
          </span>
          <span>
            {structure.rootFileCount} {t("fileTree.rootFilesSuffix")}
          </span>
          {structure.treeTruncated ? (
            <span className="text-risk-medium">{t("fileTree.treeTruncated")}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="card-title">{t("fileTree.importantPresent")}</h4>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {structure.importantFilesPresent.length === 0 ? (
              <li className="text-sm text-slate-500">{t("fileTree.noneDetected")}</li>
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
          <h4 className="card-title">{t("fileTree.notableMissing")}</h4>
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
          <h4 className="card-title">{t("fileTree.recognizedFolders")}</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {structure.importantFolders.length === 0 ? (
              <span className="text-sm text-slate-500">{t("fileTree.noneDetected")}</span>
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
            {t("fileTree.suspiciousFiles")}
          </h4>
          {structure.suspiciousFiles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{t("fileTree.noneDetected")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {structure.suspiciousFiles.slice(0, 10).map((file) => (
                <li
                  key={file}
                  className="flex items-center gap-2 text-xs text-slate-300"
                >
                  <code className="break-all font-mono">{file}</code>
                  <CopyButton value={file} label={t("finding.copyPath")} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            {t("fileTree.suspiciousFooter")}
          </p>
        </div>
      </div>
    </section>
  );
}
