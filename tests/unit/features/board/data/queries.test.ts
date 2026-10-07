import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { posts, threads } from "@/db/schema";
import {
  countThreadsByBoard,
  getBoardMember,
  getThread,
  listRecentThreadSummariesByBoard,
  listThreadSummariesByAuthor,
  listThreadDocuments,
  listThreads,
  forumActivitySeed,
} from "@/features/board/data/queries";

// The database behind the board reads is stubbed: drizzle builders need a
// live connection to construct, so the suite queues rows per query point and
// asserts the mapping (uniqueness, counters, tombstones, roles) over them.
// Real SQL shapes (joins, GROUP BY, DISTINCT ON) are covered by the seeded
// e2e run instead.
vi.mock("@/db", () => ({
  db: {
    query: {
      sections: { findFirst: vi.fn() },
      user: { findFirst: vi.fn() },
      threads: { findMany: vi.fn() },
      posts: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    select: vi.fn(),
    selectDistinctOn: vi.fn(),
  },
}));

// The actor behind the voted flag is stubbed: guests read every thread as
// unvoted without touching the votes table.
vi.mock("@/features/account/contracts", () => ({ getActorSession: vi.fn() }));

import { db } from "@/db";
import { getActorSession } from "@/features/account/contracts";

const mockSession = getActorSession as unknown as Mock;

// Drizzle builders need a live connection to construct, so the suite drives
// the queries through untyped stubs: one cast at the seam, while the
// full-column rows below stay honest against $inferSelect.
const mockDb = db as unknown as {
  query: {
    sections: { findFirst: Mock };
    user: { findFirst: Mock };
    threads: { findMany: Mock };
    posts: { findMany: Mock; findFirst: Mock };
  };
  select: Mock;
  selectDistinctOn: Mock;
};

type SectionId = { id: string };
type UserId = { id: string };
type AuthorRef = {
  username: string | null;
  image: string | null;
  level: string;
  admin: boolean;
};
type PostRow = typeof posts.$inferSelect & { author: AuthorRef };
type ThreadRow = typeof threads.$inferSelect & {
  section: { slug: string };
  author: AuthorRef;
  posts: PostRow[];
  threadTags: { tag: { slug: string } }[];
};

const ADA_ID = "user-ada";
const GRACE_ID = "user-grace";
const KEN_ID = "user-ken";

const ADA: AuthorRef = { username: "ada", image: null, level: "member", admin: true };
const GRACE: AuthorRef = { username: "grace", image: null, level: "member", admin: false };
const KEN: AuthorRef = {
  username: "ken",
  image: "/img/ken.png",
  level: "participant",
  admin: false,
};

const SEC_GENERAL = "sec-general";
const SEC_ERRATA = "sec-errata";

// Valid v4 uuids: getThread rejects anything else before touching the database.
const T_PINNED = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const T_HOT = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22";
const T_ERRATA = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33";

const T1_ROOT = "post-t1-root";
const T1_REPLY_GRACE = "post-t1-reply-grace";
const T1_REPLY_KEN = "post-t1-reply-ken";
const T2_ROOT = "post-t2-root";
const T2_TOMB = "post-t2-tomb";
const T2_REPLY = "post-t2-reply";
const T3_ROOT = "post-t3-root";

function postRow(
  id: string,
  threadId: string,
  authorId: string,
  author: AuthorRef,
  body: string,
  createdAt: string,
  overrides: Partial<typeof posts.$inferSelect> = {},
): PostRow {
  return {
    id,
    threadId,
    authorId,
    replyToId: null,
    body,
    createdAt: new Date(createdAt),
    editedAt: null,
    deletedAt: null,
    ...overrides,
    author,
  };
}

function threadRow(
  id: string,
  slug: string,
  authorId: string,
  author: AuthorRef,
  title: string,
  createdAt: string,
  overrides: {
    tags?: string[];
    techs?: string[];
    pinned?: boolean;
    locked?: boolean;
    lastPostAt?: string | null;
    posts?: PostRow[];
  } = {},
): ThreadRow {
  return {
    id,
    sectionId: slug === "general" ? SEC_GENERAL : SEC_ERRATA,
    projectId: null,
    authorId,
    title,
    techs: overrides.techs ?? [],
    pinned: overrides.pinned ?? false,
    locked: overrides.locked ?? false,
    lastPostAt:
      overrides.lastPostAt === undefined
        ? null
        : overrides.lastPostAt === null
          ? null
          : new Date(overrides.lastPostAt),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    deletedAt: null,
    section: { slug },
    author,
    posts: overrides.posts ?? [],
    threadTags: (overrides.tags ?? []).map((tag) => ({ tag: { slug: tag } })),
  };
}

function threadFixtures(): ThreadRow[] {
  return [
    threadRow(T_PINNED, "general", ADA_ID, ADA, "Pinned thread", "2026-09-10T12:00:00.000Z", {
      tags: ["proposal"],
      techs: ["typescript"],
      pinned: true,
      lastPostAt: "2026-09-17T08:20:00.000Z",
      posts: [
        postRow(T1_ROOT, T_PINNED, ADA_ID, ADA, "Read this first.", "2026-09-10T12:00:00.000Z"),
        postRow(
          T1_REPLY_GRACE,
          T_PINNED,
          GRACE_ID,
          GRACE,
          "Pinned indeed.",
          "2026-09-17T08:20:00.000Z",
        ),
        postRow(T1_REPLY_KEN, T_PINNED, KEN_ID, KEN, "Noted.", "2026-09-17T09:00:00.000Z"),
      ],
    }),
    threadRow(T_HOT, "general", GRACE_ID, GRACE, "Hot thread", "2026-09-12T10:00:00.000Z", {
      // Unknown slugs never reach the model: the board speaks its closed
      // vocabularies, the seed owns the rows.
      tags: ["question", "bogus"],
      techs: ["c", "bogus-tech"],
      lastPostAt: "2026-09-16T10:00:00.000Z",
      posts: [
        postRow(T2_ROOT, T_HOT, GRACE_ID, GRACE, "Hot take.", "2026-09-12T10:00:00.000Z"),
        postRow(T2_TOMB, T_HOT, KEN_ID, KEN, "regret", "2026-09-13T10:00:00.000Z", {
          deletedAt: new Date("2026-09-14T10:00:00.000Z"),
        }),
        postRow(T2_REPLY, T_HOT, ADA_ID, ADA, "Seconded.", "2026-09-16T10:00:00.000Z"),
      ],
    }),
    threadRow(T_ERRATA, "errata", KEN_ID, KEN, "Errata note", "2026-09-14T10:00:00.000Z", {
      lastPostAt: "2026-09-14T10:00:00.000Z",
      posts: [
        postRow(T3_ROOT, T_ERRATA, KEN_ID, KEN, "My mistake, fixed.", "2026-09-14T10:00:00.000Z", {
          editedAt: new Date("2026-09-15T10:00:00.000Z"),
        }),
      ],
    }),
  ];
}

function voteRows(): { targetType: string; targetId: string; total: number }[] {
  return [
    { targetType: "thread", targetId: T_PINNED, total: 7 },
    { targetType: "thread", targetId: T_HOT, total: 12 },
    { targetType: "post", targetId: T1_ROOT, total: 7 },
    { targetType: "post", targetId: T1_REPLY_GRACE, total: 3 },
    { targetType: "post", targetId: T2_ROOT, total: 12 },
    { targetType: "post", targetId: T2_TOMB, total: 5 },
    { targetType: "post", targetId: T2_REPLY, total: 1 },
    { targetType: "post", targetId: T3_ROOT, total: 4 },
  ];
}

// Every select/selectDistinctOn link returns the chain; awaiting it resolves
// the queued rows (the terminal the implementation awaits).
function queueSelect(value: unknown): void {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    groupBy: () => chain,
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(value).then(resolve, reject),
  };
  mockDb.select.mockReturnValue(chain);
}

function queueDistinctOn(value: unknown): void {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(value).then(resolve, reject),
  };
  mockDb.selectDistinctOn.mockReturnValue(chain);
}

function queueThreadList(rows: ThreadRow[]): void {
  mockDb.query.threads.findMany.mockResolvedValue(rows);
  queueSelect(voteRows());
}

// The two selects behind a thread list, in call order: the vote aggregate,
// then the actor's own thread votes.
function queueVoteQueries(countRows: unknown, votedRows: { targetId: string }[]): void {
  const chainFor = (value: unknown): unknown => {
    const chain = {
      from: (): unknown => chain,
      where: (): unknown => chain,
      orderBy: (): unknown => chain,
      groupBy: (): unknown => chain,
      then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
        Promise.resolve(value).then(resolve, reject),
    };
    return chain;
  };
  mockDb.select.mockReturnValueOnce(chainFor(countRows));
  mockDb.select.mockReturnValueOnce(chainFor(votedRows));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("board reads over postgres", () => {
  it("maps summaries with vote counts, roles and avatars", async () => {
    queueThreadList(threadFixtures());
    const summaries = new Map((await listThreads()).map((thread) => [thread.id, thread]));
    expect([...summaries.keys()].sort()).toEqual([T_ERRATA, T_HOT, T_PINNED].sort());

    const pinned = summaries.get(T_PINNED);
    expect(pinned?.board).toBe("general");
    expect(pinned?.votes).toBe(7);
    expect(pinned?.replies).toBe(2);
    expect(pinned?.lastActivityAt).toBe("2026-09-17T09:00:00.000Z");
    expect(pinned?.tags).toEqual(["proposal"]);
    expect(pinned?.techs).toEqual(["typescript"]);
    expect(pinned?.author).toEqual({ user: "ada", role: "maintainer", avatar: "/avatars/ada.png" });

    // Admins maintain, members contribute, everyone else takes part; the
    // account image wins over the bundled face (grace keeps her registry one).
    expect(summaries.get(T_HOT)?.author).toEqual({
      user: "grace",
      role: "contributor",
      avatar: "/avatars/grace.png",
    });
    expect(summaries.get(T_ERRATA)?.author).toEqual({
      user: "ken",
      role: "member",
      avatar: "/img/ken.png",
    });
  });

  it("drops unknown tag and tech slugs at the boundary", async () => {
    queueThreadList(threadFixtures());
    const summaries = new Map((await listThreads()).map((thread) => [thread.id, thread]));
    expect(summaries.get(T_HOT)?.tags).toEqual(["question"]);
    expect(summaries.get(T_HOT)?.techs).toEqual(["c"]);
  });

  it("tombstones deleted posts without their text", async () => {
    queueThreadList(threadFixtures().filter((thread) => thread.id === T_HOT));
    const thread = await getThread(T_HOT);
    expect(thread?.posts.map((post) => post.id)).toEqual([T2_ROOT, T2_TOMB, T2_REPLY]);
    const tomb = thread?.posts.find((post) => post.id === T2_TOMB);
    expect(tomb?.body).toBe("");
    expect(tomb?.deletedAt).toBe("2026-09-14T10:00:00.000Z");
    // The tombstone keeps its place but drops out of the reply count.
    const summaries = new Map((await listThreads()).map((entry) => [entry.id, entry]));
    expect(summaries.get(T_HOT)?.replies).toBe(1);
  });

  it("marks server-edited posts", async () => {
    queueThreadList(threadFixtures().filter((thread) => thread.id === T_ERRATA));
    const thread = await getThread(T_ERRATA);
    expect(thread?.posts[0]?.editedAt).toBe("2026-09-15T10:00:00.000Z");
    expect(thread?.posts[0]?.body).toBe("My mistake, fixed.");
  });

  it("keeps posts in chronological order", async () => {
    queueThreadList(threadFixtures());
    for (const document of await listThreadDocuments()) {
      const times = document.posts.map((post) => Date.parse(post.createdAt));
      expect(times, `${document.id} posts are out of order`).toEqual(
        [...times].sort((a, b) => a - b),
      );
    }
  });

  it("reads the whole feed without a limit for the global hot rank", async () => {
    queueThreadList(threadFixtures());
    await listThreads();
    const calls: unknown[][] = mockDb.query.threads.findMany.mock.calls;
    expect(calls[0]).not.toHaveProperty("limit");
  });

  it("returns null for non-uuid and unknown ids without querying", async () => {
    queueThreadList(threadFixtures());
    expect(await getThread("read-first")).toBeNull();
    expect(mockDb.query.threads.findMany).not.toHaveBeenCalled();
    mockDb.query.threads.findMany.mockResolvedValue([]);
    queueSelect([]);
    expect(await getThread(T_PINNED)).toBeNull();
  });

  it("marks the actor's voted threads", async () => {
    mockSession.mockResolvedValue({ user: "ada" });
    mockDb.query.user.findFirst.mockResolvedValue({ id: ADA_ID } satisfies UserId);
    mockDb.query.threads.findMany.mockResolvedValue(threadFixtures());
    queueVoteQueries(voteRows(), [{ targetId: T_HOT }]);
    const summaries = new Map((await listThreads()).map((thread) => [thread.id, thread]));
    expect(summaries.get(T_HOT)?.voted).toBe(true);
    expect(summaries.get(T_PINNED)?.voted).toBe(false);
    expect(summaries.get(T_ERRATA)?.voted).toBe(false);
  });

  it("reads every thread as unvoted for guests", async () => {
    mockSession.mockResolvedValue(null);
    queueThreadList(threadFixtures());
    const summaries = await listThreads();
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every((thread) => thread.voted === false)).toBe(true);
  });

  it("reads every thread as unvoted when the actor has no user row", async () => {
    mockSession.mockResolvedValue({ user: "ghost" });
    mockDb.query.user.findFirst.mockResolvedValue(null);
    queueThreadList(threadFixtures());
    const summaries = await listThreads();
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every((thread) => thread.voted === false)).toBe(true);
  });
});

describe("getBoardMember", () => {
  it("resolves the member from their first post", async () => {
    mockDb.query.user.findFirst.mockResolvedValue({ id: ADA_ID } satisfies UserId);
    const first = postRow(
      T1_ROOT,
      T_PINNED,
      ADA_ID,
      ADA,
      "Read this first.",
      "2026-09-10T12:00:00.000Z",
    );
    mockDb.query.posts.findFirst.mockResolvedValue(first);
    expect(await getBoardMember("ada")).toEqual({
      user: "ada",
      role: "maintainer",
      avatar: "/avatars/ada.png",
    });
  });

  it("returns null for handles without rows or posts", async () => {
    mockDb.query.user.findFirst.mockResolvedValue(null);
    expect(await getBoardMember("nobody")).toBeNull();
    mockDb.query.user.findFirst.mockResolvedValue({ id: "user-ghost" } satisfies UserId);
    mockDb.query.posts.findFirst.mockResolvedValue(null);
    expect(await getBoardMember("ghost")).toBeNull();
  });
});

describe("listThreadSummariesByAuthor", () => {
  it("returns the author's threads", async () => {
    mockDb.query.user.findFirst.mockResolvedValue({ id: GRACE_ID } satisfies UserId);
    queueThreadList(threadFixtures().filter((thread) => thread.authorId === GRACE_ID));
    const summaries = await listThreadSummariesByAuthor("grace");
    expect(summaries.map((thread) => thread.id)).toEqual([T_HOT]);
  });

  it("returns an empty list for unknown handles", async () => {
    mockDb.query.user.findFirst.mockResolvedValue(null);
    expect(await listThreadSummariesByAuthor("nobody")).toEqual([]);
    expect(mockDb.query.threads.findMany).not.toHaveBeenCalled();
  });
});

describe("forumActivitySeed", () => {
  it("counts threads and excludes roots and tombstones from replies", async () => {
    mockDb.query.user.findFirst.mockResolvedValue({ id: KEN_ID } satisfies UserId);
    mockDb.select.mockReturnValueOnce(
      ((): unknown => {
        const chain = {
          from: () => chain,
          where: () => chain,
          then: (resolve: (value: unknown) => void) => resolve([{ total: 1 }]),
        };
        return chain;
      })(),
    );
    mockDb.query.posts.findMany.mockResolvedValue([
      { id: T3_ROOT, threadId: T_ERRATA, createdAt: new Date("2026-09-14T10:00:00.000Z") },
      { id: T1_REPLY_KEN, threadId: T_PINNED, createdAt: new Date("2026-09-17T09:00:00.000Z") },
    ]);
    queueDistinctOn([
      { threadId: T_ERRATA, createdAt: new Date("2026-09-14T10:00:00.000Z"), id: T3_ROOT },
      { threadId: T_PINNED, createdAt: new Date("2026-09-10T12:00:00.000Z"), id: T1_ROOT },
    ]);
    // T3_ROOT is the errata root (not a reply); the tombstone never surfaces
    // among the live posts at all.
    expect(await forumActivitySeed("ken")).toEqual({
      posts: 1,
      replies: [{ threadId: T_PINNED, postId: T1_REPLY_KEN }],
    });
  });

  it("returns zeros for unknown handles without further queries", async () => {
    mockDb.query.user.findFirst.mockResolvedValue(null);
    expect(await forumActivitySeed("nobody")).toEqual({ posts: 0, replies: [] });
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

describe("countThreadsByBoard", () => {
  it("counts the full journal independently of its preview", async () => {
    mockDb.query.sections.findFirst.mockResolvedValue({ id: SEC_GENERAL } satisfies SectionId);
    queueSelect([{ total: 2 }]);
    expect(await countThreadsByBoard("swearjar-dos")).toBe(2);
  });

  it("counts zero boards without threads", async () => {
    mockDb.query.sections.findFirst.mockResolvedValue(null);
    expect(await countThreadsByBoard("flagship")).toBe(0);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

describe("listRecentThreadSummariesByBoard", () => {
  const now = Date.parse("2026-09-20T00:00:00.000Z");

  it("returns pinned first, then the freshest, within the limit", async () => {
    mockDb.query.sections.findFirst.mockResolvedValue({ id: SEC_GENERAL } satisfies SectionId);
    const rows = threadFixtures().filter((thread) => thread.section.slug === "general");
    queueThreadList(rows);
    const summaries = await listRecentThreadSummariesByBoard("general", 2, now);
    expect(summaries.map((thread) => thread.id)).toEqual([T_PINNED, T_HOT]);
  });

  it("returns an empty journal for a board without threads", async () => {
    mockDb.query.sections.findFirst.mockResolvedValue(null);
    expect(await listRecentThreadSummariesByBoard("flagship", 3, now)).toEqual([]);
  });

  it("short-circuits a zero limit without querying", async () => {
    expect(await listRecentThreadSummariesByBoard("general", 0, now)).toEqual([]);
    expect(mockDb.query.sections.findFirst).not.toHaveBeenCalled();
  });
});
