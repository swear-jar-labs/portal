import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import {
  boardIds,
  isBoardId,
  isTagId,
  tagIds,
  tagTones,
  threadPath,
} from "@/features/board/threads";

describe("board taxonomy", () => {
  it("keeps a label for every board and tag", () => {
    expect(Object.keys(messages.board.boards).sort()).toEqual([...boardIds].sort());
    expect(Object.keys(messages.board.tags).sort()).toEqual([...tagIds].sort());
  });

  it("gives every tone to a known tag", () => {
    for (const [tag, tone] of Object.entries(tagTones)) {
      expect(tagIds, `${tag} is toned but unknown`).toContain(tag);
      expect(tone).toBeTypeOf("string");
    }
  });

  it("guards the board and tag ids", () => {
    expect(isBoardId("tooling")).toBe(true);
    expect(isBoardId("nope")).toBe(false);
    expect(isTagId("proposal")).toBe(true);
    expect(isTagId("nope")).toBe(false);
  });

  it("owns the thread URL canon", () => {
    expect(threadPath("read-first")).toBe("/discussions/read-first");
  });
});
