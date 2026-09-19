import { describe, expect, expectTypeOf, it } from "vitest";
import * as boardContract from "@/features/board/contracts";
import type { ThreadSummary } from "@/features/board/contracts";

describe("board contract", () => {
  it("publishes exactly the agreed surface", () => {
    expect(Object.keys(boardContract).sort()).toEqual([
      "MemberLayerOutlet",
      "ThreadRows",
      "getBoardMember",
      "listThreadSummariesByAuthor",
    ]);
  });

  it("keeps the published thread summary type importable", () => {
    expectTypeOf<ThreadSummary>().toHaveProperty("replies");
    expectTypeOf<ThreadSummary["replies"]>().toEqualTypeOf<number>();
  });
});
