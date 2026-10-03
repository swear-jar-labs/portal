import { describe, expect, it } from "vitest";
import {
  isRecentEvent,
  JAR_TOP_COMMANDS,
  JAR_WINDOW_MS,
  recentEvents,
  topBadCommands,
} from "@/features/shell/model/jar";

const NOW = 1_000_000_000_000;

describe("jar model", () => {
  it("spans a sliding 24 hours", () => {
    expect(JAR_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
    expect(isRecentEvent({ at: NOW - JAR_WINDOW_MS + 1, raw: "ASDF" }, NOW)).toBe(true);
    expect(isRecentEvent({ at: NOW - JAR_WINDOW_MS, raw: "ASDF" }, NOW)).toBe(false);
  });

  it("counts only the window, oldest first", () => {
    const events = [
      { at: NOW - JAR_WINDOW_MS - 1, raw: "OLD" },
      { at: NOW - 2, raw: "B" },
      { at: NOW - 3, raw: "A" },
    ];
    expect(recentEvents(events, NOW).map((event) => event.raw)).toEqual(["B", "A"]);
  });

  it("ranks the top misses by count, then freshness", () => {
    const events = [
      { at: NOW - 30, raw: "asdf" },
      { at: NOW - 20, raw: "ASDF" },
      { at: NOW - 10, raw: "qwer" },
      { at: NOW - JAR_WINDOW_MS - 1, raw: "stale" },
      { at: NOW - 5, raw: "  " },
    ];
    expect(topBadCommands(events, NOW)).toEqual([
      { raw: "ASDF", count: 2, lastAt: NOW - 20 },
      { raw: "QWER", count: 1, lastAt: NOW - 10 },
    ]);
    expect(JAR_TOP_COMMANDS).toBe(3);
  });
});
