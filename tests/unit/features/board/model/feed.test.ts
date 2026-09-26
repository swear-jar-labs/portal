import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEED_QUERY,
  feedQueryParams,
  filterThreads,
  parseFeedQuery,
  rankThreads,
  sameFeedQuery,
  type RankableThread,
} from "@/features/board/model/feed";

const NOW = Date.parse("2026-09-16T12:00:00.000Z");

function thread(overrides: Partial<RankableThread> & Pick<RankableThread, "id">): RankableThread {
  return {
    board: "general",
    tags: [],
    pinned: false,
    votes: 0,
    replies: 0,
    createdAt: "2026-09-15T12:00:00.000Z",
    lastActivityAt: "2026-09-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("filterThreads", () => {
  const threads = [
    thread({ id: "a", board: "general", tags: ["question", "craft"] }),
    thread({ id: "b", board: "tooling", tags: ["tooling"] }),
    thread({ id: "c", board: "tooling", tags: ["craft"] }),
  ];

  it("returns everything without filters", () => {
    expect(filterThreads(threads, {}).map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by board", () => {
    expect(filterThreads(threads, { board: "tooling" }).map((entry) => entry.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("filters by tag", () => {
    expect(filterThreads(threads, { tag: "craft" }).map((entry) => entry.id)).toEqual(["a", "c"]);
  });

  it("combines board and tag", () => {
    expect(filterThreads(threads, { board: "tooling", tag: "craft" }).map((e) => e.id)).toEqual([
      "c",
    ]);
    expect(filterThreads(threads, { board: "compiler", tag: "craft" })).toEqual([]);
  });
});

describe("rankThreads", () => {
  it("keeps pinned threads on top under both sorts", () => {
    const threads = [
      thread({ id: "fresh", lastActivityAt: "2026-09-16T11:00:00.000Z" }),
      thread({ id: "pinned", pinned: true, lastActivityAt: "2026-08-01T00:00:00.000Z" }),
    ];
    expect(rankThreads(threads, "hot", NOW).map((entry) => entry.id)).toEqual(["pinned", "fresh"]);
    expect(rankThreads(threads, "new", NOW).map((entry) => entry.id)).toEqual(["pinned", "fresh"]);
  });

  it("sorts hot by score: votes weigh double and age damps", () => {
    const threads = [
      // (2*2 + 0 + 1) / (1 + 2) = 1.67
      thread({ id: "quick", votes: 2, lastActivityAt: "2026-09-16T11:00:00.000Z" }),
      // (2*10 + 0 + 1) / (11 + 2) = 1.62
      thread({ id: "popular", votes: 10, lastActivityAt: "2026-09-16T01:00:00.000Z" }),
      // (0 + 4 + 1) / (50 + 2) = 0.10
      thread({ id: "chatty", replies: 4, lastActivityAt: "2026-09-14T10:00:00.000Z" }),
    ];
    expect(rankThreads(threads, "hot", NOW).map((entry) => entry.id)).toEqual([
      "quick",
      "popular",
      "chatty",
    ]);
  });

  it("sorts new by last activity, newest first", () => {
    const threads = [
      thread({ id: "older", lastActivityAt: "2026-09-14T10:00:00.000Z" }),
      thread({ id: "newest", lastActivityAt: "2026-09-16T11:59:00.000Z" }),
      thread({ id: "middle", lastActivityAt: "2026-09-16T06:00:00.000Z" }),
    ];
    expect(rankThreads(threads, "new", NOW).map((entry) => entry.id)).toEqual([
      "newest",
      "middle",
      "older",
    ]);
  });

  it("breaks ties by last activity and then by id", () => {
    const activity = "2026-09-16T10:00:00.000Z";
    const threads = [
      thread({ id: "b", votes: 1, lastActivityAt: activity }),
      thread({ id: "a", votes: 1, lastActivityAt: activity }),
      thread({ id: "fresher", votes: 1, lastActivityAt: "2026-09-16T11:00:00.000Z" }),
    ];
    expect(rankThreads(threads, "hot", NOW).map((entry) => entry.id)).toEqual([
      "fresher",
      "a",
      "b",
    ]);
  });

  it("does not reward future timestamps", () => {
    const threads = [
      thread({ id: "future", votes: 1, lastActivityAt: "2026-09-17T12:00:00.000Z" }),
      thread({ id: "now", votes: 1, lastActivityAt: "2026-09-16T12:00:00.000Z" }),
    ];
    const [first] = rankThreads(threads, "hot", NOW);
    // Same score, the tie goes to the fresher activity.
    expect(first?.id).toBe("future");
  });
});

describe("feed URL codec", () => {
  it("parses valid filters and falls back on unknown values", () => {
    expect(parseFeedQuery(new URLSearchParams("board=tooling&tag=craft&sort=new"))).toEqual({
      board: "tooling",
      tag: "craft",
      sort: "new",
    });
    expect(parseFeedQuery(new URLSearchParams("board=nope&tag=nah&sort=sideways"))).toEqual(
      DEFAULT_FEED_QUERY,
    );
    expect(parseFeedQuery(new URLSearchParams())).toEqual(DEFAULT_FEED_QUERY);
  });

  it("keeps defaults out of the URL and round-trips the rest", () => {
    expect(feedQueryParams(DEFAULT_FEED_QUERY).toString()).toBe("");
    const query = { board: "compiler", tag: "proposal", sort: "new" } as const;
    expect(feedQueryParams(query).toString()).toBe("board=compiler&tag=proposal&sort=new");
    expect(parseFeedQuery(feedQueryParams(query))).toEqual(query);
  });

  it("compares queries structurally", () => {
    expect(sameFeedQuery(DEFAULT_FEED_QUERY, { sort: "hot" })).toBe(true);
    expect(sameFeedQuery({ sort: "hot" }, { sort: "new" })).toBe(false);
    expect(sameFeedQuery({ board: "errata", sort: "hot" }, { board: "errata", sort: "hot" })).toBe(
      true,
    );
    expect(sameFeedQuery({ board: "errata", sort: "hot" }, { sort: "hot" })).toBe(false);
  });
});
