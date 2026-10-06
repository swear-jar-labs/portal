import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  addConfirmedPost,
  boardSnapshot,
  deletePost,
  resetBoardStore,
} from "@/features/board/data/board-store";
import { forumActivitySeed } from "@/features/board/data/queries";
import { forumActivityCounts } from "@/features/board/data/forum-activity";

// The seed reads through the mocked database (no connection in units);
// session deltas stay in the store.
vi.mock("@/db", () => ({
  db: {
    query: { user: { findFirst: vi.fn() }, posts: { findMany: vi.fn() } },
    select: vi.fn(),
    selectDistinctOn: vi.fn(),
  },
}));

import { db } from "@/db";

const mockDb = db as unknown as {
  query: { user: { findFirst: Mock }; posts: { findMany: Mock } };
  select: Mock;
  selectDistinctOn: Mock;
};

function selectChain(value: unknown): unknown {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
  resetBoardStore();
});

const ada = { user: "ada", role: "member" } as const;
const ken = { user: "ken", role: "member" } as const;

describe("forum activity", () => {
  it("counts database posts and replies separately", async () => {
    mockDb.query.user.findFirst.mockResolvedValue({ id: "user-ada" });
    mockDb.select.mockReturnValue(selectChain([{ total: 2 }]));
    mockDb.query.posts.findMany.mockResolvedValue([
      { id: "reply-1", threadId: "thread-1", createdAt: new Date("2026-09-16T10:00:00.000Z") },
      { id: "reply-2", threadId: "thread-1", createdAt: new Date("2026-09-17T10:00:00.000Z") },
    ]);
    mockDb.selectDistinctOn.mockReturnValue(
      selectChain([
        { threadId: "thread-1", createdAt: new Date("2026-09-12T10:00:00.000Z"), id: "root" },
      ]),
    );
    const seed = await forumActivitySeed("ada");
    expect(seed.posts).toBe(2);
    expect(seed.replies).toHaveLength(2);
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({
      posts: seed.posts,
      replies: seed.replies.length,
    });
  });

  it("adds session replies, then drops tombstoned replies", () => {
    const seed = {
      posts: 1,
      replies: [{ threadId: "fixture", postId: "fixture-reply" }],
    };
    addConfirmedPost("thread-1", {
      id: "reply-ada",
      author: ada,
      body: "Reply",
      createdAt: "2026-09-18T10:00:00.000Z",
      votes: 0,
    });
    addConfirmedPost("thread-1", {
      id: "reply-ken",
      author: ken,
      body: "Other",
      createdAt: "2026-09-18T11:00:00.000Z",
      votes: 0,
    });
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({ posts: 1, replies: 2 });

    deletePost("fixture", "fixture-reply");
    deletePost("thread-1", "reply-ada");
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({ posts: 1, replies: 0 });
  });

  it("counts a revalidated confirmed reply once", () => {
    // The profile seed refreshes under the SPA session: once it echoes the
    // confirmed reply, the session copy must not count again.
    const seed = {
      posts: 1,
      replies: [{ threadId: "thread-1", postId: "reply-ada" }],
    };
    addConfirmedPost("thread-1", {
      id: "reply-ada",
      author: ada,
      body: "Reply",
      createdAt: "2026-09-18T10:00:00.000Z",
      votes: 0,
    });
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({ posts: 1, replies: 1 });
  });
});
