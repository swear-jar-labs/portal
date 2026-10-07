import { describe, expect, it } from "vitest";
import * as boardServer from "@/features/board/contracts/server";

describe("board server contract", () => {
  it("publishes exactly the six server reads", () => {
    // The cross-feature RSC surface: server components import these from
    // contracts/server.ts (lint-allowlisted); the client-safe barrel
    // (index.ts) must never carry them — see client-graph.test.ts.
    expect(Object.keys(boardServer).sort()).toEqual([
      "countThreadsByBoard",
      "forumActivitySeed",
      "getBoardMember",
      "listRecentThreadSummariesByBoard",
      "listTagCatalog",
      "listThreadSummariesByAuthor",
    ]);
  });
});
