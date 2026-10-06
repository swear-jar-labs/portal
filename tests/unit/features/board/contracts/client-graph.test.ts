import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Pinned boundary: client components import the board contract barrel, so
// every module it pulls must resolve without server modules. Next replaces
// "use server" imports with RPC stubs in client bundles, so traversal stops
// at that boundary; type-only imports vanish at compile and are skipped
// too. Anything else reaching @/db (or node builtins) breaks the browser
// build — fs/net/tls/perf_hooks via the pg driver, exactly the rolled-back
// breakage this guards against.
const SRC = path.join(process.cwd(), "src");
const BARREL = path.join(SRC, "features/board/contracts/index.ts");

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

// Specifiers that must never resolve in the client graph (outside a
// "use server" boundary): the database entry, its tables, the driver, and
// node builtins (the kit's own lint already bans @/db for @swearjar/dos,
// so that entry stays external here).
function isServerSpecifier(spec: string): boolean {
  return (
    spec === "@/db" ||
    spec.startsWith("@/db/") ||
    spec === "postgres" ||
    spec === "pg" ||
    spec.startsWith("node:")
  );
}

function resolveSpec(spec: string, fromDir: string): string | null {
  if (spec.startsWith("@/")) {
    return resolveFile(path.join(SRC, spec.slice(2)));
  }
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return resolveFile(path.join(fromDir, spec));
  }
  return null;
}

function resolveFile(base: string): string | null {
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    try {
      if (readFileSync(candidate, "utf8") !== null) return candidate;
    } catch {
      // Not a file — try the next candidate.
    }
  }
  return null;
}

function isServerBoundary(source: string): boolean {
  const prologue = source.replace(/^(\s*\/\*[\s\S]*?\*\/|\s*\/\/[^\n]*|\s*)/, "").slice(0, 32);
  return prologue.startsWith('"use server"') || prologue.startsWith("'use server'");
}

function isClientModule(source: string): boolean {
  const prologue = source.replace(/^(\s*\/\*[\s\S]*?\*\/|\s*\/\/[^\n]*|\s*)/, "").slice(0, 32);
  return prologue.startsWith('"use client"') || prologue.startsWith("'use client'");
}

// A value import that only names types still vanishes: `import { type X }`
// binds nothing at runtime.
function bindsValue(statement: string): boolean {
  const names = statement.replace(/^[ \t]*import\s+/, "").split("from")[0] ?? "";
  if (
    /^\s*\*/.test(names) ||
    (/^[ \t]*[A-Za-z_$][\w$]*/.test(names) && !names.trimStart().startsWith("{"))
  ) {
    return true;
  }
  const brace = names.match(/\{([\s\S]*)\}/)?.[1] ?? "";
  const values = brace
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "" && !/^type\b/.test(entry));
  return values.length > 0;
}

function runtimeImportsStrict(source: string): string[] {
  const specs: string[] = [];
  const withoutTypes = source.replace(/^[ \t]*(import|export)\s+type\b[\s\S]*?;[ \t]*$/gm, "");
  const statementPattern =
    /(^[ \t]*import(?:(?!\bfrom\b)[\s\S])*?\bfrom\s+["']([^"']+)["'][ \t]*;|^[ \t]*export(?:(?!\bfrom\b)[\s\S])*?\bfrom\s+["']([^"']+)["'][ \t]*;|^[ \t]*import\s+["']([^"']+)["'][ \t]*;)/gm;
  for (const match of withoutTypes.matchAll(statementPattern)) {
    const statement = match[0];
    const spec = match[2] ?? match[3] ?? match[4];
    if (spec === undefined) continue;
    if (/^[ \t]*import\s+["']/.test(statement)) {
      specs.push(spec);
      continue;
    }
    if (statement.trimStart().startsWith("export") || bindsValue(statement)) {
      specs.push(spec);
    }
  }
  return specs;
}

function walkClientGraph(entry: string): { file: string; spec: string; chain: string[] }[] {
  const violations: { file: string; spec: string; chain: string[] }[] = [];
  const visited = new Set<string>();
  const queue: { file: string; chain: string[] }[] = [{ file: entry, chain: [entry] }];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || visited.has(current.file)) continue;
    visited.add(current.file);
    let source: string;
    try {
      source = readFileSync(current.file, "utf8");
    } catch {
      continue;
    }
    if (isServerBoundary(source)) continue;
    for (const spec of runtimeImportsStrict(source)) {
      if (isServerSpecifier(spec)) {
        violations.push({ file: current.file, spec, chain: current.chain });
        continue;
      }
      if (spec.endsWith(".css") || spec.includes("!")) continue;
      if (!spec.startsWith("./") && !spec.startsWith("../") && !spec.startsWith("@/")) continue;
      const resolved = resolveSpec(spec, path.dirname(current.file));
      if (resolved !== null && !visited.has(resolved)) {
        queue.push({ file: resolved, chain: [...current.chain, resolved] });
      }
    }
  }
  return violations;
}

describe("board contract client graph", () => {
  it("resolves without server modules outside use-server boundaries", () => {
    const violations = walkClientGraph(BARREL);
    expect(
      violations.map(({ file, spec, chain }) =>
        chain
          .map((entry) => path.relative(SRC, entry))
          .concat(`${path.relative(SRC, file)} imports ${spec}`)
          .join(" -> "),
      ),
    ).toEqual([]);
  });

  it("keeps every client-side board importer free of server modules", () => {
    const entries = collectClientBoardImporters();
    // The sweep must actually find importers; an empty entry list would
    // vacuously pass while the boundary rots.
    expect(entries.length).toBeGreaterThan(0);
    const violations = entries.flatMap((entry) =>
      walkClientGraph(entry).map(
        ({ file, spec, chain }) =>
          `${path.relative(SRC, entry)} :: ` +
          chain
            .map((node) => path.relative(SRC, node))
            .concat(`${path.relative(SRC, file)} imports ${spec}`)
            .join(" -> "),
      ),
    );
    expect(violations).toEqual([]);
  });
});

// Reverse sweep: every "use client" module under src/ whose runtime imports
// resolve into the board slice. A client entry importing the server reads
// (contracts/server, the facade, or data/queries directly) flags here —
// those entries are server-component-only by rule.
function collectClientBoardImporters(): string[] {
  const boardDir = path.join(SRC, "features/board") + path.sep;
  const entries: string[] = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      if (name.isDirectory()) {
        visit(full);
        continue;
      }
      if (!name.isFile() || (!full.endsWith(".ts") && !full.endsWith(".tsx"))) continue;
      let source: string;
      try {
        source = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      if (!isClientModule(source)) continue;
      const importsBoard = runtimeImportsStrict(source).some((spec) => {
        if (!spec.startsWith("./") && !spec.startsWith("../") && !spec.startsWith("@/")) {
          return false;
        }
        const resolved = resolveSpec(spec, path.dirname(full));
        return resolved !== null && (resolved + path.sep).startsWith(boardDir);
      });
      if (importsBoard) entries.push(full);
    }
  };
  visit(SRC);
  return entries.sort();
}
