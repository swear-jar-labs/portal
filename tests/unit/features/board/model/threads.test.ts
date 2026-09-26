import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import {
  boardIds,
  boardTitle,
  composableBoardIds,
  isBoardId,
  isTagId,
  staticBoardIds,
  tagIds,
  tagTones,
  threadPath,
} from "@/features/board/model/threads";

describe("board taxonomy", () => {
  it("keeps chrome labels for the static boards only", () => {
    expect(Object.keys(messages.board.boards).sort()).toEqual([...staticBoardIds].sort());
    expect(Object.keys(messages.board.tags).sort()).toEqual([...tagIds].sort());
  });

  it("titles every board, journals by project name", () => {
    expect(boardTitle("general")).toBe("GENERAL");
    expect(boardTitle("errata")).toBe("ERRATA");
    expect(boardTitle("swearjar-dos")).toBe("SWEARJAR.DOS");
    expect(boardTitle("compiler")).toBe("Compiler");
    expect(boardTitle("tooling")).toBe("Tooling");
    expect(boardTitle("token-cache")).toBe("Token Cache");
    expect(boardTitle("flagship")).toBe("Flagship");
  });

  it("composes everywhere except the archive", () => {
    expect(composableBoardIds).not.toContain("token-cache");
    expect([...composableBoardIds].sort()).toEqual(
      boardIds.filter((id) => id !== "token-cache").sort(),
    );
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
    expect(threadPath("read-first")).toBe("/forum/read-first");
  });
});
