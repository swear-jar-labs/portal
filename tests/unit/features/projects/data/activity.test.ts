import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { collectActivity } from "@/features/projects/data/activity";
import { projectSlugs } from "@/features/projects/model/projects";

// The journal reads server-side now: the aggregation is driven over canned
// contract answers (the feed↔seed coherence itself is e2e territory).
// The mock handle lives in vi.hoisted: the barrel no longer exports the
// server read, so there is no value import to grab it from.
const { mockRecent } = vi.hoisted(() => ({ mockRecent: vi.fn() as Mock }));

vi.mock("@/features/board/contracts/server", () => ({
  listRecentThreadSummariesByBoard: mockRecent,
}));

function journalEntry(id: string, lastActivityAt: string): { id: string; lastActivityAt: string } {
  return { id, lastActivityAt };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("collectActivity", () => {
  it("reads the freshest journal activity per slug through the board", async () => {
    const journals: Record<string, { id: string; lastActivityAt: string }[]> = {
      "swearjar-dos": [journalEntry("dos", "2026-09-18T09:00:00.000Z")],
      compiler: [journalEntry("compiler", "2026-09-17T08:20:00.000Z")],
      tooling: [journalEntry("tooling", "2026-09-16T06:05:00.000Z")],
      "token-cache": [journalEntry("cache", "2026-08-30T14:00:00.000Z")],
    };
    mockRecent.mockImplementation(async (board: string) => journals[board] ?? []);
    const now = Date.parse("2026-09-20T00:00:00.000Z");
    const activity = await collectActivity([...projectSlugs], now);
    expect(activity).toEqual({
      "swearjar-dos": "2026-09-18T09:00:00.000Z",
      compiler: "2026-09-17T08:20:00.000Z",
      tooling: "2026-09-16T06:05:00.000Z",
      "token-cache": "2026-08-30T14:00:00.000Z",
    });
    for (const slug of projectSlugs) {
      expect(mockRecent).toHaveBeenCalledWith(slug, 1, now);
    }
  });

  it("skips boards without journal entries", async () => {
    mockRecent.mockResolvedValue([]);
    expect(await collectActivity(["flagship"], Date.now())).toEqual({});
  });
});
