import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { posts, threads, threadTags } from "@/db/schema";
import {
  composeRecord,
  composeThread,
  deletePost,
  deleteRecord,
  editPost,
  editRecord,
  replyRecord,
  replyToThread,
  togglePostVote,
  toggleThreadVote,
  voteRecord,
  type BoardTx,
} from "@/features/board/data/board-actions";
import { BOARD_FEED_TAG, boardThreadTag } from "@/features/board/data/board-invalidation";
import type { ComposeInput } from "@/features/board/model/schema";

// Actions run against stub transaction clients and mocked gates: no
// database, no session. The stubs assert the gates (guest/author), the
// tombstone write, and the vote toggle direction.
vi.mock("@/db", () => ({ db: { transaction: vi.fn() } }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/features/account/contracts", () => ({ getActorSession: vi.fn() }));

import { db } from "@/db";
import { revalidatePath, updateTag } from "next/cache";
import { getActorSession } from "@/features/account/contracts";

const mockTransaction = db.transaction as unknown as Mock;
const mockTag = updateTag as unknown as Mock;
const mockPath = revalidatePath as unknown as Mock;
const mockSession = getActorSession as unknown as Mock;

const THREAD_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const POST_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22";
const REPLY_ID = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33";
const AUTHOR_ID = "author-1";
const OTHER_ID = "author-2";

type TxCall = { op: string; table: string; values?: unknown; set?: unknown };

type StubConfig = {
  user?: unknown;
  section?: unknown;
  tagRows?: unknown[];
  thread?: unknown;
  post?: unknown;
  vote?: unknown;
  insertedThreadId?: string;
  insertedPostId?: string;
};

// A stub transaction client: queries resolve the queued rows, writes record
// their calls. One cast at the seam (drizzle clients need a live database).
function stubTx(config: StubConfig = {}): { tx: BoardTx; calls: TxCall[] } {
  const calls: TxCall[] = [];
  const tableName = (table: unknown): string =>
    table === threads
      ? "threads"
      : table === posts
        ? "posts"
        : table === threadTags
          ? "thread_tags"
          : "votes";
  const tx = {
    query: {
      user: {
        findFirst: async () => (config.user === undefined ? { id: AUTHOR_ID } : config.user),
      },
      sections: {
        findFirst: async () => (config.section === undefined ? { id: "sec-1" } : config.section),
      },
      tags: { findMany: async () => config.tagRows ?? [] },
      threads: { findFirst: async () => config.thread ?? null },
      posts: { findFirst: async () => config.post ?? null },
      votes: { findFirst: async () => config.vote ?? null },
    },
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        const tableId = tableName(table);
        calls.push({ op: "insert", table: tableId, values });
        const rows =
          tableId === "threads"
            ? [{ id: config.insertedThreadId ?? THREAD_ID }]
            : tableId === "posts"
              ? [
                  {
                    id: config.insertedPostId ?? REPLY_ID,
                    createdAt: new Date("2026-09-19T10:00:00.000Z"),
                  },
                ]
              : [];
        return {
          returning: async () => rows,
          then: (resolve: (value: unknown) => void) => resolve(rows),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (set: unknown) => {
        calls.push({ op: "update", table: tableName(table), set });
        return { where: async () => [] };
      },
    }),
    delete: (table: unknown) => {
      calls.push({ op: "delete", table: tableName(table) });
      return { where: async () => [] };
    },
  };
  return { tx: tx as unknown as BoardTx, calls };
}

const COMPOSE_INPUT: ComposeInput = {
  board: "general",
  tags: ["proposal"],
  techs: ["typescript"],
  title: "A new thread",
  body: "Opening post.",
};

function tagRow(id: string): { id: string } {
  return { id };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockSession.mockResolvedValue({ user: "ada" });
});

describe("composeRecord", () => {
  it("commits the thread, its root post and its tags, and returns the id", async () => {
    const { tx, calls } = stubTx({ tagRows: [tagRow("tag-proposal")] });
    const outcome = await composeRecord(tx, "ada", COMPOSE_INPUT);
    expect(outcome).toEqual({ result: { ok: true, id: THREAD_ID }, threadId: THREAD_ID });
    const threadInsert = calls.find((call) => call.table === "threads");
    expect(threadInsert?.values).toMatchObject({ title: "A new thread", techs: ["typescript"] });
    expect(calls.some((call) => call.table === "posts")).toBe(true);
    expect(calls.some((call) => call.table === "thread_tags")).toBe(true);
  });

  it("refuses unknown boards, members and tag rows as unavailable", async () => {
    const { tx } = stubTx({ section: null, tagRows: [tagRow("tag-proposal")] });
    expect(await composeRecord(tx, "ada", COMPOSE_INPUT)).toEqual({
      result: { ok: false, error: "unavailable" },
      threadId: null,
    });
    const noUser = stubTx({ user: null, tagRows: [tagRow("tag-proposal")] });
    expect(await composeRecord(noUser.tx, "ghost", COMPOSE_INPUT)).toEqual({
      result: { ok: false, error: "unavailable" },
      threadId: null,
    });
    const noTags = stubTx({ tagRows: [] });
    expect(await composeRecord(noTags.tx, "ada", COMPOSE_INPUT)).toEqual({
      result: { ok: false, error: "unavailable" },
      threadId: null,
    });
  });
});

describe("replyRecord", () => {
  it("appends the reply and refreshes the thread activity", async () => {
    const { tx, calls } = stubTx({ thread: { id: THREAD_ID, locked: false } });
    const outcome = await replyRecord(tx, "ada", THREAD_ID, "A reply.", undefined);
    expect(outcome.result).toMatchObject({ ok: true });
    expect(outcome.threadId).toBe(THREAD_ID);
    expect(calls.some((call) => call.table === "threads" && call.op === "update")).toBe(true);
  });

  it("refuses missing and locked threads and stray parents", async () => {
    const { tx } = stubTx({ thread: null });
    expect(await replyRecord(tx, "ada", THREAD_ID, "A reply.", undefined)).toEqual({
      result: { ok: false, error: "missing" },
      threadId: null,
    });
    const locked = stubTx({ thread: { id: THREAD_ID, locked: true } });
    expect(await replyRecord(locked.tx, "ada", THREAD_ID, "A reply.", undefined)).toEqual({
      result: { ok: false, error: "forbidden" },
      threadId: null,
    });
    const stray = stubTx({ thread: { id: THREAD_ID, locked: false }, post: null });
    expect(await replyRecord(stray.tx, "ada", THREAD_ID, "A reply.", POST_ID)).toEqual({
      result: { ok: false, error: "invalid" },
      threadId: null,
    });
  });
});

describe("editRecord and deleteRecord", () => {
  const livePost = { id: POST_ID, authorId: AUTHOR_ID, threadId: THREAD_ID };

  it("edits the author's own live post", async () => {
    const { tx, calls } = stubTx({ post: livePost });
    const outcome = await editRecord(tx, "ada", POST_ID, "Edited.");
    expect(outcome).toEqual({ result: { ok: true, id: POST_ID }, threadId: THREAD_ID });
    const update = calls.find((call) => call.table === "posts");
    expect(update?.set).toMatchObject({ body: "Edited." });
  });

  it("gates edits by author and liveness", async () => {
    const foreign = stubTx({ post: { ...livePost, authorId: OTHER_ID } });
    expect(await editRecord(foreign.tx, "ada", POST_ID, "Edited.")).toEqual({
      result: { ok: false, error: "forbidden" },
      threadId: null,
    });
    const missing = stubTx({ post: null });
    expect(await editRecord(missing.tx, "ada", POST_ID, "Edited.")).toEqual({
      result: { ok: false, error: "missing" },
      threadId: null,
    });
  });

  it("tombstones the author's post and stays idempotent", async () => {
    const { tx, calls } = stubTx({ post: livePost });
    const outcome = await deleteRecord(tx, "ada", POST_ID);
    expect(outcome).toEqual({ result: { ok: true, id: POST_ID }, threadId: THREAD_ID });
    const update = calls.find((call) => call.table === "posts");
    expect(update?.set).toMatchObject({ deletedAt: expect.any(Date) });
    // A second delete over the same row still answers ok.
    const again = stubTx({ post: { ...livePost, deletedAt: new Date() } });
    expect(await deleteRecord(again.tx, "ada", POST_ID)).toEqual({
      result: { ok: true, id: POST_ID },
      threadId: THREAD_ID,
    });
  });

  it("gates deletes by author and existence", async () => {
    const foreign = stubTx({ post: { ...livePost, authorId: OTHER_ID } });
    expect(await deleteRecord(foreign.tx, "ada", POST_ID)).toEqual({
      result: { ok: false, error: "forbidden" },
      threadId: null,
    });
    const missing = stubTx({ post: null });
    expect(await deleteRecord(missing.tx, "ada", POST_ID)).toEqual({
      result: { ok: false, error: "missing" },
      threadId: null,
    });
  });
});

describe("voteRecord", () => {
  it("inserts the first vote and deletes the second", async () => {
    const first = stubTx({ thread: { id: THREAD_ID }, vote: null });
    expect(await voteRecord(first.tx, "ada", { kind: "thread", id: THREAD_ID })).toEqual({
      result: { ok: true, id: THREAD_ID },
      threadId: THREAD_ID,
    });
    expect(first.calls.some((call) => call.op === "insert" && call.table === "votes")).toBe(true);
    const second = stubTx({ thread: { id: THREAD_ID }, vote: { id: "vote-1" } });
    expect(await voteRecord(second.tx, "ada", { kind: "thread", id: THREAD_ID })).toEqual({
      result: { ok: true, id: THREAD_ID },
      threadId: THREAD_ID,
    });
    expect(second.calls.some((call) => call.op === "delete" && call.table === "votes")).toBe(true);
  });

  it("refuses votes on missing targets", async () => {
    const { tx } = stubTx({ thread: null });
    expect(await voteRecord(tx, "ada", { kind: "thread", id: THREAD_ID })).toEqual({
      result: { ok: false, error: "missing" },
      threadId: null,
    });
  });
});

describe("action gates", () => {
  function queueSuccess(): void {
    mockTransaction.mockImplementation(async (work: (tx: BoardTx) => Promise<unknown>) => {
      const { tx } = stubTx({
        thread: { id: THREAD_ID, locked: false },
        post: { id: POST_ID, authorId: AUTHOR_ID, threadId: THREAD_ID },
        tagRows: [tagRow("tag-proposal")],
      });
      return work(tx);
    });
  }

  it("refuses guests with login-required and revalidates nothing", async () => {
    mockSession.mockResolvedValue(null);
    const results = await Promise.all([
      composeThread(COMPOSE_INPUT),
      replyToThread(THREAD_ID, { body: "Hi." }),
      editPost(POST_ID, { body: "Edited." }),
      deletePost(POST_ID),
      toggleThreadVote(THREAD_ID),
      togglePostVote(POST_ID),
    ]);
    for (const result of results) expect(result).toEqual({ ok: false, error: "login-required" });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTag).not.toHaveBeenCalled();
    expect(mockPath).not.toHaveBeenCalled();
  });

  it("refuses invalid input before touching the database", async () => {
    expect(await composeThread({ ...COMPOSE_INPUT, board: "nope" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await replyToThread("not-a-uuid", { body: "Hi." })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await editPost(POST_ID, { body: "" })).toEqual({ ok: false, error: "invalid" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("heals tags and paths after a successful compose", async () => {
    queueSuccess();
    const result = await composeThread(COMPOSE_INPUT);
    expect(result).toMatchObject({ ok: true, id: THREAD_ID });
    expect(mockTag).toHaveBeenCalledWith(BOARD_FEED_TAG);
    expect(mockTag).toHaveBeenCalledWith(boardThreadTag(THREAD_ID));
    expect(mockPath).toHaveBeenCalledWith("/forum");
    expect(mockPath).toHaveBeenCalledWith(`/forum/${THREAD_ID}`);
    expect(mockPath).toHaveBeenCalledWith("/", "layout");
  });

  it("revalidates nothing when the work fails", async () => {
    mockTransaction.mockImplementation(async (work: (tx: BoardTx) => Promise<unknown>) => {
      const { tx } = stubTx({ post: null });
      return work(tx);
    });
    expect(await editPost(POST_ID, { body: "Edited." })).toEqual({
      ok: false,
      error: "missing",
    });
    expect(mockTag).not.toHaveBeenCalled();
    expect(mockPath).not.toHaveBeenCalled();
  });
});
