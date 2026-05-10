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
  /** Lowercased path -> original-cased path. Use for case-insensitive lookups. */
  blobPathsLower: Map<string, string>;
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
  /** Case-insensitive lookup helpers. */
  hasFile: (...candidates: string[]) => string | null;
  hasFolder: (...candidates: string[]) => string | null;
}

const NOISE_FOLDER_PREFIXES = [
  "test/",
  "tests/",
  "__tests__/",
  "__mocks__/",
  "__fixtures__/",
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
  "documentation/",
  "website/",
  "site/",
  "vendor/",
  "third_party/",
  "third-party/",
  "node_modules/",
  "dist/",
  "build/",
];

export function isInNoiseFolder(lowerPath: string): boolean {
  return NOISE_FOLDER_PREFIXES.some(
    (prefix) => lowerPath.startsWith(prefix) || lowerPath.includes(`/${prefix}`),
  );
}

// CamelCase / snake_case code-file basenames that contain a
// suspicious-hint substring but are obviously source code, not
// leaked secrets. Without this, any auth library that ships a
// `tokenStore.ts` / `tokenManager.js` / `apiKeyStore.ts` flags
// itself — not useful for users. The list is conservative: every
// entry would have to be a deliberately-named file *with* a real
// secret in it to slip through.
const NOISE_BASENAME_HINTS = [
  "tokenizer",
  "tokenize",
  "tokenization",
  "tokenstore",
  "tokenmanager",
  "tokenauth",
  "tokenservice",
  "tokenprovider",
  "tokenutils",
  "tokenhelper",
  "secretscanner",
  "secretdetector",
  "secretmanager",
  "secretrotation",
  "credentialstore",
  "credentialprovider",
  "credentialhelper",
  "apikey",
  "apikeystore",
  "apikeymanager",
];
const NOISE_EXTENSIONS = [".lock", ".md", ".mdx", ".rst", ".txt"];

function isAllowedSuspicious(path: string): boolean {
  const lower = path.toLowerCase();
  return SUSPICIOUS_ALLOW_LIST.some((entry) => lower.endsWith(entry));
}

export function classifyFiles(
  tree: RepoTree,
  importantFiles: ImportantFile[],
): ClassifiedFiles {
  const blobPaths = new Set<string>();
  const blobPathsLower = new Map<string, string>();
  const rootFiles: string[] = [];
  const rootFolders = new Set<string>();
  const rootFoldersLower = new Map<string, string>();
  const filesByFolder = new Map<string, number>();
  let totalFiles = 0;

  for (const entry of tree.entries) {
    if (entry.type === "blob") {
      blobPaths.add(entry.path);
      blobPathsLower.set(entry.path.toLowerCase(), entry.path);
      totalFiles += 1;
      const slashIndex = entry.path.indexOf("/");
      if (slashIndex === -1) {
        rootFiles.push(entry.path);
      } else {
        const top = entry.path.slice(0, slashIndex);
        rootFolders.add(top);
        rootFoldersLower.set(top.toLowerCase(), top);
        const second = entry.path.indexOf("/", slashIndex + 1);
        const folderKey = second === -1 ? top : entry.path.slice(0, second);
        filesByFolder.set(folderKey, (filesByFolder.get(folderKey) ?? 0) + 1);
      }
    } else if (entry.type === "tree") {
      if (!entry.path.includes("/")) {
        rootFolders.add(entry.path);
        rootFoldersLower.set(entry.path.toLowerCase(), entry.path);
      }
    }
  }

  const hasFile = (...candidates: string[]): string | null => {
    for (const c of candidates) {
      if (!c) continue;
      const found = blobPathsLower.get(c.toLowerCase());
      if (found) return found;
    }
    return null;
  };

  const hasFolder = (...candidates: string[]): string | null => {
    for (const c of candidates) {
      if (!c) continue;
      const cl = c.toLowerCase();
      const root = rootFoldersLower.get(cl);
      if (root) return root;
      // Look for folder anywhere in tree (single-segment match against parents).
      for (const lower of blobPathsLower.keys()) {
        if (lower.startsWith(`${cl}/`)) return c;
        if (lower.includes(`/${cl}/`)) return c;
      }
    }
    return null;
  };

  const importantFilesPresent: string[] = [];
  const importantFilesMissing: string[] = [];
  for (const file of IMPORTANT_ROOT_FILES) {
    const found = blobPathsLower.get(file.toLowerCase());
    if (found) importantFilesPresent.push(found);
    else importantFilesMissing.push(file);
  }

  const importantFolders = IMPORTANT_FOLDERS.filter((folder) => {
    if (folder.includes("/")) {
      const lower = folder.toLowerCase();
      for (const path of blobPathsLower.keys()) {
        if (path.startsWith(`${lower}/`)) return true;
      }
      return false;
    }
    return !!hasFolder(folder);
  });

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
      Array.from(blobPathsLower.keys()).some((p) => p.startsWith(folder)),
    ) ||
    Array.from(blobPathsLower.keys()).some((p) =>
      TEST_FILE_HINTS.some((hint) => p.includes(hint)),
    );

  const hasDocsFolder = importantFolders.includes("docs");

  const workflowPaths = Array.from(blobPathsLower.entries())
    .filter(([lower]) => lower.startsWith(".github/workflows/"))
    .map(([, original]) => original);
  const hasGithubWorkflows = workflowPaths.length > 0;

  const importantFileMap = new Map<string, ImportantFile>();
  for (const file of importantFiles) {
    importantFileMap.set(file.path, file);
    importantFileMap.set(file.path.toLowerCase(), file);
  }

  return {
    blobPaths,
    blobPathsLower,
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
    hasFile,
    hasFolder,
  };
}
