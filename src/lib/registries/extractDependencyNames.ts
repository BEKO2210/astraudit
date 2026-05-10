/**
 * Tiny dep-name extractors for Python and Rust manifests — Phase 3.8.
 *
 * For npm we already have `manifest.dependencyNames` from the
 * `packageManifest.ts` parser. For Python and Rust we don't (they use
 * separate manifest formats), so we ship two minimal parsers tuned to
 * the *names only* — we don't care about version ranges here, just
 * "what packages does this project depend on?".
 *
 * Scope:
 *   - Python:
 *       · `requirements.txt` style: one `name[==version]` per line.
 *       · `pyproject.toml [project] dependencies = ["…"]` (PEP 621).
 *       · `pyproject.toml [tool.poetry.dependencies]` (table form).
 *   - Rust:
 *       · `Cargo.toml [dependencies]` (table form, optionally with
 *         `[dependencies.name]` sub-tables).
 *
 * Anything more elaborate (Pipfile, Pipfile.lock, Cargo workspace
 * inheritance, optional groups) is out of scope — the registry panel
 * is best-effort.
 */

const PEP_SPECIFIER_RE = /^([A-Za-z0-9_.-]+)/;

/** Pull names from `requirements.txt` content. Strips comments,
 *  options (`-r`, `--index-url`), markers, and version specifiers. */
export function namesFromRequirementsTxt(content: string): string[] {
  const out: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    // Strip inline comment.
    const hash = line.indexOf("#");
    if (hash >= 0) line = line.slice(0, hash).trim();
    if (!line) continue;
    // Skip option lines: -r, --requirement, --index-url, etc.
    if (line.startsWith("-")) continue;
    // Skip URL-based requirements.
    if (/^https?:\/\//i.test(line)) continue;
    // Strip environment markers (`pkg ; sys_platform == 'linux'`).
    const semi = line.indexOf(";");
    if (semi >= 0) line = line.slice(0, semi).trim();
    const m = line.match(PEP_SPECIFIER_RE);
    if (m) out.push(m[1]);
  }
  return out;
}

/**
 * Extract dependency names from a `pyproject.toml`. We look for two
 * places:
 *   1. PEP 621 `[project] dependencies = [ "…" ]` — array of PEP 508
 *      strings.
 *   2. `[tool.poetry.dependencies]` — TOML key-value table.
 *
 * The parser is line-based — Astraudit deliberately doesn't pull a
 * full TOML library for this one feature. Both forms walk lines and
 * track section state, which avoids the bracket-nesting trap that a
 * single regex hits on PEP 508 extras notation
 * (e.g. `pydantic[email]>=2.0`).
 */
export function namesFromPyproject(content: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (name: string) => {
    if (!name) return;
    const trimmed = name.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  };

  const lines = content.split(/\r?\n/);

  // 1. PEP 621 — start when we see `[project]`, look for the
  //    `dependencies = [` line, then collect quoted entries until the
  //    closing `]`. We do a depth count so brackets inside extras
  //    notation (`pydantic[email]`) survive.
  let inProject = false;
  let collecting = false;
  let bracketDepth = 0;
  for (const raw of lines) {
    const line = raw;
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      inProject = sectionMatch[1].trim() === "project";
      collecting = false;
      bracketDepth = 0;
      continue;
    }
    if (!inProject) continue;
    if (!collecting) {
      const m = line.match(/^\s*dependencies\s*=\s*\[(.*)$/);
      if (m) {
        collecting = true;
        bracketDepth = 1;
        // The opening line may already contain entries.
        for (const entry of m[1].matchAll(/["']([^"'\n]+)["']/g)) {
          const nameMatch = entry[1].match(PEP_SPECIFIER_RE);
          if (nameMatch) push(nameMatch[1]);
        }
        // The line might also already close the array.
        for (const ch of m[1]) {
          if (ch === "[") bracketDepth += 1;
          else if (ch === "]") bracketDepth -= 1;
        }
        if (bracketDepth <= 0) collecting = false;
      }
      continue;
    }
    // Continuing a multi-line `dependencies = [ … ]`.
    for (const entry of line.matchAll(/["']([^"'\n]+)["']/g)) {
      const nameMatch = entry[1].match(PEP_SPECIFIER_RE);
      if (nameMatch) push(nameMatch[1]);
    }
    for (const ch of line) {
      if (ch === "[") bracketDepth += 1;
      else if (ch === "]") bracketDepth -= 1;
    }
    if (bracketDepth <= 0) {
      collecting = false;
      inProject = false; // bracket-balanced; close the project block too
    }
  }

  // 2. Poetry table form — track section state on a fresh pass so the
  //    PEP 621 walk above doesn't bleed in. Stop collecting the moment
  //    a new `[…]` heading appears.
  let inPoetryDeps = false;
  for (const raw of lines) {
    const line = raw;
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      inPoetryDeps = sectionMatch[1].trim() === "tool.poetry.dependencies";
      continue;
    }
    if (!inPoetryDeps) continue;
    const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
    if (m) {
      const name = m[1];
      if (name.toLowerCase() === "python") continue;
      push(name);
    }
  }

  return out;
}

/**
 * Extract crate names from a `Cargo.toml`. Recognises both the table
 * form (`[dependencies] name = "…"`) and the sub-table form
 * (`[dependencies.name]`). Like the pyproject parser, we walk lines
 * and track section state so a `[dev-dependencies]` block can't
 * leak into the production list.
 */
export function namesFromCargoToml(content: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  };

  let inDeps = false;
  for (const raw of content.split(/\r?\n/)) {
    const sectionMatch = raw.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      const header = sectionMatch[1].trim();
      // Sub-table form: `[dependencies.name]`.
      const sub = header.match(/^dependencies\.([A-Za-z0-9_-]+)$/);
      if (sub) {
        push(sub[1]);
        inDeps = false;
        continue;
      }
      inDeps = header === "dependencies";
      continue;
    }
    if (!inDeps) continue;
    const m = raw.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
    if (m) push(m[1]);
  }

  return out;
}
