import { describe, expect, expectTypeOf, it } from "vitest";
import * as boardContract from "@/features/board/contracts";
import type { ThreadSummary } from "@/features/board/contracts";

describe("board contract", () => {
  it("publishes exactly the agreed surface", () => {
    // Client-safe leaves only: server reads (data/queries.ts) must never
    // come back here — client components import this barrel, and anything
    // it pulls lands in the browser bundle (see client-graph.test.ts).
    expect(Object.keys(boardContract).sort()).toEqual([
      "ErrataJarRow",
      "FEED_PATH",
      "JournalRows",
      "ThreadRows",
      "VoteButton",
      "useForumActivity",
    ]);
  });

  it("keeps the published thread summary type importable", () => {
    expectTypeOf<ThreadSummary>().toHaveProperty("replies");
    expectTypeOf<ThreadSummary["replies"]>().toEqualTypeOf<number>();
  });
});
