import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import {
  boardIds,
  formatAge,
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

describe("formatAge", () => {
  const now = "2026-09-16T12:00:00.000Z";

  it("reads young ages as JUST NOW", () => {
    expect(formatAge("2026-09-16T11:59:30.000Z", now)).toBe("JUST NOW");
    expect(formatAge("not-a-date", now)).toBe("JUST NOW");
  });

  it("formats minutes, hours, days and weeks", () => {
    expect(formatAge("2026-09-16T11:30:00.000Z", now)).toBe("30M AGO");
    expect(formatAge("2026-09-16T09:00:00.000Z", now)).toBe("3H AGO");
    expect(formatAge("2026-09-13T12:00:00.000Z", now)).toBe("3D AGO");
    expect(formatAge("2026-09-01T12:00:00.000Z", now)).toBe("2W AGO");
  });
});
