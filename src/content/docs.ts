import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const docIds = ["ABOUT", "MANIFESTO", "HOW", "RULES"] as const;

export type DocId = (typeof docIds)[number];

const DOCS_DIR = join(process.cwd(), "content", "docs", "en");
const DOC_EXTENSION = ".md";

const heroSchema = z.strictObject({
  title: z.string().min(1),
  tagline: z.string().min(1),
});

const docFrontmatterSchema = z.strictObject({
  id: z.enum(docIds),
  title: z.string().min(1),
  hero: heroSchema.optional(),
});

export type DocHero = z.infer<typeof heroSchema>;

export type Doc = {
  id: DocId;
  title: string;
  hero?: DocHero;
  body: string;
};

function readDoc(fileName: string): Doc {
  const source = readFileSync(join(DOCS_DIR, fileName), "utf8");
  const { data, content } = matter(source);
  return { ...docFrontmatterSchema.parse(data), body: content.trim() };
}

function readDocs(): readonly Doc[] {
  const byId = new Map<DocId, Doc>();
  for (const entry of readdirSync(DOCS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(DOC_EXTENSION)) continue;
    const doc = readDoc(entry.name);
    if (byId.has(doc.id)) throw new Error(`Duplicate doc id ${doc.id} (${entry.name})`);
    byId.set(doc.id, doc);
  }

  const docs: Doc[] = [];
  for (const id of docIds) {
    const doc = byId.get(id);
    if (!doc) throw new Error(`Missing doc file for ${id} in ${DOCS_DIR}`);
    docs.push(doc);
  }
  return docs;
}

// Read once per module evaluation: production `/` is static — `next build` bakes
// the docs. In dev, editing a Markdown file needs a server restart: `content/`
// is outside the module graph, so the dev server does not invalidate this module.
export const docs: readonly Doc[] = readDocs();
