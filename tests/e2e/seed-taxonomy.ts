// The taxonomy seed: the single source of the tag rows (statuses and the
// shared tech set) every seeded run reads. Slugs come from the code
// vocabularies (`tagIds`, `techIds` — the form validation enums), labels
// from the current messages strings; the invariant test in
// tests/unit/e2e/seed-taxonomy.test.ts pins the three sides together, so a
// drift in any of them fails fast. Ticket labels are not seeded here: their
// rows arrive with the tickets card (`backend-tickets`).
//
// Idempotent like the board seed: fixed slugs land on the unique key, reruns
// insert nothing.

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { messages } from "../../src/content/messages";
import { techIds } from "../../src/content/techs";
import { tagIds, techKind, threadStatusKind } from "../../src/features/board/model/threads";
import { tags } from "../../src/db/schema";

export type SeedTagKind = typeof threadStatusKind | typeof techKind;

export type SeedTag = {
  slug: string;
  label: string;
  kind: SeedTagKind;
  sort: number;
};

// The canon order: statuses first (proposal, then question), techs in the
// shared vocabulary order. Board chips, pickers and stack rows sort by
// `sort` inside their kind and read this order.
export const SEED_TAG_CATALOG: readonly SeedTag[] = [
  ...tagIds.map((slug, sort) => ({
    slug,
    label: messages.board.tags[slug],
    kind: threadStatusKind,
    sort,
  })),
  ...techIds.map((slug, sort) => ({
    slug,
    label: messages.readroom.tags[slug],
    kind: techKind,
    sort,
  })),
];

export type SeedTaxonomyReport = {
  tags: number;
};

// Seeds the catalog into an already-connected database. The board seed owns
// the connection; direct execution is not supported — `db:seed` lands in
// seed-board.ts, which calls this first.
export async function seedTaxonomy(db: PostgresJsDatabase): Promise<SeedTaxonomyReport> {
  const report: SeedTaxonomyReport = { tags: 0 };
  for (const tag of SEED_TAG_CATALOG) {
    const inserted = await db
      .insert(tags)
      .values({ slug: tag.slug, label: tag.label, kind: tag.kind, sort: tag.sort })
      .onConflictDoNothing()
      .returning({ id: tags.id });
    report.tags += inserted.length;
  }
  return report;
}
