import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import {
  boardIds,
  boardTitle,
  composableBoardIds,
  countRecentErrata,
  isBoardId,
  isTagId,
  isThreadTechId,
  staticBoardIds,
  tagIds,
  tagTones,
  threadPath,
  threadTechIds,
  type ThreadSummary,
} from "@/features/board/model/threads";

describe("board taxonomy", () => {
  it("keeps chrome labels for the static boards only", () => {
    expect(Object.keys(messages.board.boards).sort()).toEqual([...staticBoardIds].sort());
    expect(Object.keys(messages.board.tags).sort()).toEqual([...tagIds].sort());
  });

  it("titles every board, journals by project name", () => {
    expect(boardTitle("general")).toBe("GENERAL");
    expect(boardTitle("errata")).toBe("ERRATA");
    expect(boardTitle("ideas")).toBe("IDEAS");
    expect(boardTitle("interviews")).toBe("INTERVIEWS");
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
    expect(isThreadTechId("rust")).toBe(true);
    expect(isThreadTechId("nope")).toBe(false);
  });

  it("keeps the status and tech vocabularies disjoint", () => {
    // The unified pickers route by isTagId: an id in both lists would land in
    // the wrong array.
    for (const tag of tagIds) {
      expect(threadTechIds, `${tag} is both a status and a tech`).not.toContain(tag);
    }
    for (const tech of threadTechIds) {
      expect(tagIds, `${tech} is both a tech and a status`).not.toContain(tech);
    }
  });

  it("owns the thread URL canon", () => {
    expect(threadPath("read-first")).toBe("/forum/read-first");
  });

  it("counts only fresh errata for the jar", () => {
    const hour = 60 * 60 * 1000;
    const now = Date.parse("2026-10-03T12:00:00.000Z");
    const at = (hoursAgo: number) => new Date(now - hoursAgo * hour).toISOString();
    const summary = (id: string, board: string, createdAt: string): ThreadSummary => ({
      id,
      board,
      title: id,
      author: { user: "ada", role: "member" },
      tags: [],
      techs: [],
      pinned: false,
      locked: false,
      createdAt,
      votes: 0,
      voted: false,
      replies: 0,
      lastActivityAt: createdAt,
    });
    const rows = [
      summary("fresh-errata", "errata", at(2)),
      summary("stale-errata", "errata", at(25)),
      summary("fresh-general", "general", at(1)),
    ];
    expect(countRecentErrata(rows, now, 24 * hour)).toBe(1);
  });
});
