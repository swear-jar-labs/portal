import { readFileSync } from "node:fs";
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
});
