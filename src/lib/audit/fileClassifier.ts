import type { ImportantFile, RepoTree } from "../../types/github";
import {
  IMPORTANT_FOLDERS,
  IMPORTANT_ROOT_FILES,
  SUSPICIOUS_ALLOW_LIST,
  SUSPICIOUS_FILE_HINTS,
  TEST_FILE_HINTS,
  TEST_FOLDER_HINTS,
} from "../../data/auditRules";

export interface ClassifiedFiles {
  blobPaths: Set<string>;
  rootFiles: string[];
  rootFolders: string[];
  importantFilesPresent: string[];
  importantFilesMissing: string[];
  importantFolders: string[];
  suspiciousFiles: string[];
  hasTestSignals: boolean;
  hasDocsFolder: boolean;
  hasGithubWorkflows: boolean;
  workflowPaths: string[];
  filesByFolder: Map<string, number>;
  rootFileCount: number;
  totalFiles: number;
  importantFileMap: Map<string, ImportantFile>;
}

function isAllowedSuspicious(path: string): boolean {
  const lower = path.toLowerCase();
  return SUSPICIOUS_ALLOW_LIST.some((entry) => lower.endsWith(entry));
}

export function classifyFiles(
  tree: RepoTree,
  importantFiles: ImportantFile[],
): ClassifiedFiles {
  const blobPaths = new Set<string>();
  const rootFiles: string[] = [];
  const rootFolders = new Set<string>();
  const filesByFolder = new Map<string, number>();
  let totalFiles = 0;
  for (const entry of tree.entries) {
    if (entry.type === "blob") {
      blobPaths.add(entry.path);
      totalFiles += 1;
      const slashIndex = entry.path.indexOf("/");
      if (slashIndex === -1) {
        rootFiles.push(entry.path);
      } else {
        const top = entry.path.slice(0, slashIndex);
        rootFolders.add(top);
        const second = entry.path.indexOf("/", slashIndex + 1);
        const folderKey =
          second === -1 ? top : entry.path.slice(0, second);
        filesByFolder.set(folderKey, (filesByFolder.get(folderKey) ?? 0) + 1);
      }
    } else if (entry.type === "tree") {
      if (!entry.path.includes("/")) {
        rootFolders.add(entry.path);
      }
    }
  }

  const importantFilesPresent = IMPORTANT_ROOT_FILES.filter((file) =>
    blobPaths.has(file),
  );
  const importantFilesMissing = IMPORTANT_ROOT_FILES.filter(
    (file) => !blobPaths.has(file),
  );

  const importantFolders = IMPORTANT_FOLDERS.filter((folder) => {
    if (folder.includes("/")) {
      for (const path of blobPaths) {
        if (path.startsWith(`${folder}/`)) return true;
      }
      return false;
    }
    if (rootFolders.has(folder)) return true;
    for (const path of blobPaths) {
      if (path.startsWith(`${folder}/`)) return true;
    }
    return false;
  });

  const NOISE_FOLDER_PREFIXES = [
    "test/",
    "tests/",
    "__tests__/",
    "spec/",
    "specs/",
    "e2e/",
    "cypress/",
    "playwright/",
    "fixtures/",
    "fixture/",
    "examples/",
    "example/",
    "demo/",
    "demos/",
    "samples/",
    "sample/",
    "docs/",
    "doc/",
    "website/",
  ];
  const NOISE_BASENAME_HINTS = ["tokenizer", "tokenize", "tokenization"];
  const NOISE_EXTENSIONS = [".lock", ".md", ".mdx", ".rst", ".txt"];
  const isInNoiseFolder = (lower: string): boolean =>
    NOISE_FOLDER_PREFIXES.some(
      (prefix) => lower.startsWith(prefix) || lower.includes(`/${prefix}`),
    );

  const suspiciousFiles: string[] = [];
  for (const path of blobPaths) {
    const lower = path.toLowerCase();
    if (isAllowedSuspicious(path)) continue;
    if (NOISE_EXTENSIONS.some((ext) => lower.endsWith(ext))) continue;
    if (isInNoiseFolder(lower)) continue;
    const basename = lower.split("/").pop() ?? lower;
    if (NOISE_BASENAME_HINTS.some((hint) => basename.includes(hint))) continue;
    if (SUSPICIOUS_FILE_HINTS.some((hint) => lower.includes(hint))) {
      suspiciousFiles.push(path);
    }
  }

  const hasTestSignals =
    TEST_FOLDER_HINTS.some((folder) =>
      Array.from(blobPaths).some((p) => p.startsWith(folder)),
    ) ||
    Array.from(blobPaths).some((p) =>
      TEST_FILE_HINTS.some((hint) => p.includes(hint)),
    );

  const hasDocsFolder = importantFolders.includes("docs");

  const workflowPaths = Array.from(blobPaths).filter((p) =>
    p.startsWith(".github/workflows/"),
  );
  const hasGithubWorkflows = workflowPaths.length > 0;

  const importantFileMap = new Map<string, ImportantFile>();
  for (const file of importantFiles) {
    importantFileMap.set(file.path, file);
  }

  return {
    blobPaths,
    rootFiles,
    rootFolders: Array.from(rootFolders).sort(),
    importantFilesPresent,
    importantFilesMissing,
    importantFolders,
    suspiciousFiles: suspiciousFiles.slice(0, 25),
    hasTestSignals,
    hasDocsFolder,
    hasGithubWorkflows,
    workflowPaths,
    filesByFolder,
    rootFileCount: rootFiles.length,
    totalFiles,
    importantFileMap,
  };
}
