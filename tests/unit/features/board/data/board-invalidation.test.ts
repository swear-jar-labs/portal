import { describe, expect, it } from "vitest";
import {
  BOARD_ACTION_ERRORS,
  BOARD_FEED_TAG,
  BOARD_INVALIDATION,
  BOARD_MUTATION_KINDS,
  boardThreadTag,
  type BoardMutationKind,
} from "@/features/board/data/board-invalidation";
import { FEED_PATH, threadPath } from "@/features/board/model/threads";

const THREAD_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("board invalidation table", () => {
  it("declares tags and paths for every mutation kind", () => {
    expect([...BOARD_MUTATION_KINDS].sort()).toEqual(
      (Object.keys(BOARD_INVALIDATION) as BoardMutationKind[]).sort(),
    );
    for (const kind of BOARD_MUTATION_KINDS) {
      const plan = BOARD_INVALIDATION[kind]({ threadId: THREAD_ID });
      // The feed tag heals every list read; the thread tag the open thread.
      expect(plan.tags).toContain(BOARD_FEED_TAG);
      expect(plan.tags).toContain(boardThreadTag(THREAD_ID));
      // Both pages revalidate; the layout root heals the shell chrome
      // (the jar counter) that reads the board.
      expect(plan.paths).toContain(FEED_PATH);
      expect(plan.paths).toContain(threadPath(THREAD_ID));
      expect(plan.layoutPaths).toContain("/");
      for (const path of plan.paths) expect(path.startsWith("/")).toBe(true);
    }
  });

  it("names one thread tag per thread", () => {
    expect(boardThreadTag(THREAD_ID)).toBe(`board-thread-${THREAD_ID}`);
    expect(boardThreadTag("other")).not.toBe(boardThreadTag(THREAD_ID));
  });

  it("keeps the action error vocabulary closed", () => {
    expect(BOARD_ACTION_ERRORS).toContain("login-required");
    expect(BOARD_ACTION_ERRORS).toContain("forbidden");
  });
});
