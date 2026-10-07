import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  boardSnapshot,
  addConfirmedPost,
  resetBoardStore,
  threadStateOf,
} from "@/features/board/data/board-store";
import {
  commitReply,
  syncPostDelete,
  syncPostEdit,
  syncPostVote,
  syncThreadVote,
} from "@/features/board/data/thread-mutations";

// The mutation sync drives stubbed server actions over the real store: no
// database, no session. The units pin the settle contract — a successful
// write drops its local delta (the revalidated server state already
// includes it), a failed one rolls back and warns.
vi.mock("@/features/board/data/board-actions", () => ({
  toggleThreadVote: vi.fn(),
  togglePostVote: vi.fn(),
  editPost: vi.fn(),
  deletePost: vi.fn(),
  replyToThread: vi.fn(),
  composeThread: vi.fn(),
}));

import * as boardActions from "@/features/board/data/board-actions";

function stubAction(name: string): Mock {
  const fn = (boardActions as unknown as Record<string, Mock>)[name];
  if (fn === undefined) throw new Error(`missing stubbed action: ${name}`);
  return fn;
}

const mockToggleThreadVote = stubAction("toggleThreadVote");
const mockTogglePostVote = stubAction("togglePostVote");
const mockEditPost = stubAction("editPost");
const mockDeletePost = stubAction("deletePost");
const mockReplyToThread = stubAction("replyToThread");

const ada = { user: "ada", role: "member" } as const;

function ok(id = "target-1"): { ok: true; id: string } {
  return { ok: true, id };
}

function denied(): { ok: false; error: "forbidden" } {
  return { ok: false, error: "forbidden" };
}

beforeEach(() => {
  vi.resetAllMocks();
  resetBoardStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncThreadVote", () => {
  it("toggles optimistically and settles the delta on success", async () => {
    mockToggleThreadVote.mockResolvedValue(ok());
    syncThreadVote("thread-1");
    expect(boardSnapshot().votedThreads.has("thread-1")).toBe(true);
    await Promise.resolve();
    // The revalidated server count already includes the vote.
    expect(boardSnapshot().votedThreads.has("thread-1")).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("rolls back and warns on failure", async () => {
    mockToggleThreadVote.mockResolvedValue(denied());
    syncThreadVote("thread-1");
    await Promise.resolve();
    expect(boardSnapshot().votedThreads.has("thread-1")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith("[board] thread vote not saved", "forbidden");
  });
});

describe("syncPostVote", () => {
  it("settles the post delta on success and rolls back on failure", async () => {
    mockTogglePostVote.mockResolvedValue(ok());
    syncPostVote("thread-1", "post-1");
    expect(threadStateOf(boardSnapshot(), "thread-1").votedPosts.has("post-1")).toBe(true);
    await Promise.resolve();
    expect(threadStateOf(boardSnapshot(), "thread-1").votedPosts.has("post-1")).toBe(false);

    mockTogglePostVote.mockResolvedValue(denied());
    syncPostVote("thread-1", "post-2");
    await Promise.resolve();
    expect(threadStateOf(boardSnapshot(), "thread-1").votedPosts.has("post-2")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith("[board] post vote not saved", "forbidden");
  });
});

describe("syncPostEdit", () => {
  it("keeps the override on success", async () => {
    mockEditPost.mockResolvedValue(ok());
    syncPostEdit("thread-1", "post-1", "revised");
    await Promise.resolve();
    expect(threadStateOf(boardSnapshot(), "thread-1").edits.get("post-1")).toBe("revised");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("clears a first edit on failure", async () => {
    mockEditPost.mockResolvedValue(denied());
    syncPostEdit("thread-1", "post-1", "revised");
    await Promise.resolve();
    expect(threadStateOf(boardSnapshot(), "thread-1").edits.has("post-1")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith("[board] edit not saved", "forbidden");
  });

  it("restores the previous override on failure", async () => {
    mockEditPost.mockResolvedValueOnce(ok());
    syncPostEdit("thread-1", "post-1", "first");
    await Promise.resolve();
    mockEditPost.mockResolvedValueOnce(denied());
    syncPostEdit("thread-1", "post-1", "second");
    await Promise.resolve();
    expect(threadStateOf(boardSnapshot(), "thread-1").edits.get("post-1")).toBe("first");
  });
});

describe("syncPostDelete", () => {
  it("drops the tombstone on success and on failure", async () => {
    mockDeletePost.mockResolvedValue(ok());
    syncPostDelete("thread-1", "post-1");
    await Promise.resolve();
    // Success settles: the revalidated thread carries the server tombstone.
    expect(threadStateOf(boardSnapshot(), "thread-1").deletedPosts.has("post-1")).toBe(false);

    mockDeletePost.mockResolvedValue(denied());
    syncPostDelete("thread-1", "post-2");
    await Promise.resolve();
    expect(threadStateOf(boardSnapshot(), "thread-1").deletedPosts.has("post-2")).toBe(false);
    expect(console.warn).toHaveBeenCalledWith("[board] delete not saved", "forbidden");
  });

  it("forgets the confirmed post on success and keeps it on failure", async () => {
    const reply = {
      id: "reply-ada",
      author: ada,
      body: "A reply.",
      createdAt: "2026-09-18T10:00:00.000Z",
      votes: 0,
    };
    addConfirmedPost("thread-1", reply);
    mockDeletePost.mockResolvedValue(ok());
    syncPostDelete("thread-1", "reply-ada");
    await Promise.resolve();
    // The revalidated seed no longer echoes the reply, so the store forgets
    // the confirmed post instead of counting it as a fresh session reply.
    expect(threadStateOf(boardSnapshot(), "thread-1").addedPosts).toEqual([]);

    addConfirmedPost("thread-1", reply);
    mockDeletePost.mockResolvedValue(denied());
    syncPostDelete("thread-1", "reply-ada");
    await Promise.resolve();
    // A failed delete rolls the tombstone back and keeps the reply.
    expect(threadStateOf(boardSnapshot(), "thread-1").addedPosts).toEqual([reply]);
  });
});

describe("commitReply", () => {
  it("renders the server-confirmed post under its real id", async () => {
    mockReplyToThread.mockResolvedValue({
      ok: true,
      id: "real-post",
      createdAt: "2026-09-19T10:00:00.000Z",
    });
    const post = await commitReply("thread-1", ada, "A reply.", undefined);
    expect(post).toMatchObject({ id: "real-post", body: "A reply.", votes: 0 });
    expect(threadStateOf(boardSnapshot(), "thread-1").addedPosts.map((entry) => entry.id)).toEqual([
      "real-post",
    ]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("renders nothing and warns on failure", async () => {
    mockReplyToThread.mockResolvedValue(denied());
    const post = await commitReply("thread-1", ada, "A reply.", "parent-1");
    expect(post).toBeUndefined();
    expect(threadStateOf(boardSnapshot(), "thread-1").addedPosts).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith("[board] reply not saved", "forbidden");
  });
});
