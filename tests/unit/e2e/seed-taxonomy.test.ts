import { describe, expect, test } from "vitest";

import { tagKind } from "@/db/schema";
import { messages } from "@/content/messages";
import { techIds } from "@/content/techs";
import { tagIds, techKind, threadStatusKind } from "@/features/board/model/threads";
import { SEED_TAG_CATALOG } from "../../e2e/seed-taxonomy";

// The taxonomy invariant (taxonomy-unify): one vocabulary in three places —
// the code enums the forms validate by (`tagIds`, `techIds`), the seed rows
// the database reads labels from, and the `tag_kind` enum. A drift in any of
// them renames a chip, a picker option or a filter without a matching change
// elsewhere, so the three pin each other here.
describe("taxonomy seed invariant", () => {
  test("the schema owns exactly the three canon kinds", () => {
    expect([...tagKind.enumValues].sort()).toEqual(
      [threadStatusKind, techKind, "ticket_label"].sort(),
    );
  });

  test("status rows match the board vocabulary with its labels", () => {
    const rows = SEED_TAG_CATALOG.filter((row) => row.kind === threadStatusKind);
    expect(rows.map((row) => row.slug)).toEqual([...tagIds]);
    for (const row of rows) {
      expect(row.label).toBe(messages.board.tags[row.slug as (typeof tagIds)[number]]);
    }
  });

  test("tech rows match the shared vocabulary with its labels", () => {
    const rows = SEED_TAG_CATALOG.filter((row) => row.kind === techKind);
    expect(rows.map((row) => row.slug)).toEqual([...techIds]);
    for (const row of rows) {
      expect(row.label).toBe(messages.readroom.tags[row.slug as (typeof techIds)[number]]);
    }
  });

  test("sorts run dense from zero inside each kind", () => {
    for (const kind of [threadStatusKind, techKind] as const) {
      const sorts = SEED_TAG_CATALOG.filter((row) => row.kind === kind).map((row) => row.sort);
      expect(sorts).toEqual(sorts.map((_, index) => index));
    }
  });

  test("slugs are unique and only the two board kinds seed", () => {
    const slugs = SEED_TAG_CATALOG.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(SEED_TAG_CATALOG.map((row) => row.kind))).toEqual(
      new Set([threadStatusKind, techKind]),
    );
  });
});
