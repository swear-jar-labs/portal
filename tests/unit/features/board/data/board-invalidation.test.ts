import { describe, expect, it } from "vitest";
import {
  BOARD_ACTION_ERRORS,
  BOARD_INVALIDATION,
  BOARD_MUTATION_KINDS,
  type BoardMutationKind,
} from "@/features/board/data/board-invalidation";
import { FEED_PATH, threadPath } from "@/features/board/model/threads";

const THREAD_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("board invalidation table", () => {
  it("declares paths for every mutation kind", () => {
    expect([...BOARD_MUTATION_KINDS].sort()).toEqual(
      (Object.keys(BOARD_INVALIDATION) as BoardMutationKind[]).sort(),
    );
    for (const kind of BOARD_MUTATION_KINDS) {
      const plan = BOARD_INVALIDATION[kind]({ threadId: THREAD_ID });
      // The feed (ranking and counts move on any write) plus the written
      // thread; the layout root heals the shell chrome that reads the
      // board (the jar counter).
      expect(plan.paths).toContain(FEED_PATH);
      expect(plan.paths).toContain(threadPath(THREAD_ID));
      expect(plan.layoutPaths).toContain("/");
      for (const path of [...plan.paths, ...plan.layoutPaths]) {
        expect(path.startsWith("/")).toBe(true);
      }
    }
  });

  it("keeps the action error vocabulary closed", () => {
    expect(BOARD_ACTION_ERRORS).toContain("login-required");
    expect(BOARD_ACTION_ERRORS).toContain("forbidden");
  });
});
