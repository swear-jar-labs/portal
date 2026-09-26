import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "@/features/board/data/board-store";
import type { BoardMember, ThreadSummary } from "@/features/board/model/threads";
import type { ComposeInput } from "@/features/board/model/schema";

const ada: BoardMember = { user: "ada", role: "maintainer" };
const COMPOSE_INPUT: ComposeInput = {
  board: "tooling",
  tags: ["tooling"],
  title: "CI cache",
  body: "Key the cache by compiler.",
};

beforeEach(() => {
  store.resetBoardStore();
});

function summary(id: string, replies: number, lastActivityAt: string): ThreadSummary {
  return {
    id,
    board: "general",
    title: id,
    author: ada,
    tags: [],
    pinned: false,
    locked: false,
    createdAt: "2026-09-15T12:00:00.000Z",
    votes: 0,
    replies,
    lastActivityAt,
  };
}

describe("board store", () => {
  it("toggles a thread vote on and off", () => {
    store.toggleThreadVote("tabs");
    expect(store.boardSnapshot().votedThreads.has("tabs")).toBe(true);
    store.toggleThreadVote("tabs");
    expect(store.boardSnapshot().votedThreads.has("tabs")).toBe(false);
  });

  it("keeps post votes per thread and toggles them", () => {
    store.togglePostVote("a", "a-1");
    store.togglePostVote("b", "b-1");
    store.togglePostVote("a", "a-1");
    const state = store.boardSnapshot();
    expect(store.threadStateOf(state, "a").votedPosts.has("a-1")).toBe(false);
    expect(store.threadStateOf(state, "b").votedPosts.has("b-1")).toBe(true);
  });

  it("stores an edited body and replaces it on the next edit", () => {
    store.editPost("a", "a-1", "first");
    store.editPost("a", "a-1", "second");
    expect(store.threadStateOf(store.boardSnapshot(), "a").edits.get("a-1")).toBe("second");
  });

  it("tombstones a deleted post and keeps it idempotent", () => {
    store.deletePost("a", "a-1");
    store.deletePost("a", "a-1");
    const deleted = store.threadStateOf(store.boardSnapshot(), "a").deletedPosts;
    expect(deleted.has("a-1")).toBe(true);
    expect(deleted.size).toBe(1);
  });

  it("appends replies to their thread", () => {
    const post = store.addReply("a", "Canaries first.", ada);
    store.addReply("b", "And the compiler version.", ada);
    const state = store.boardSnapshot();
    expect(post).toMatchObject({ author: ada, body: "Canaries first.", votes: 0 });
    expect(store.threadStateOf(state, "a").addedPosts.map((entry) => entry.id)).toEqual([post.id]);
    expect(store.threadStateOf(state, "b").addedPosts).toHaveLength(1);
  });

  it("keeps the parent of a reply and leaves it empty without one", () => {
    const linked = store.addReply("a", "Same here.", ada, "a-1");
    const root = store.addReply("a", "Standalone.", ada);
    expect(linked.replyTo).toBe("a-1");
    expect(root.replyTo).toBeUndefined();
  });

  it("composes a thread with one root post", () => {
    const thread = store.addThread(COMPOSE_INPUT, ada);
    store.addThread(COMPOSE_INPUT, ada);
    const state = store.boardSnapshot();

    expect(thread).toMatchObject({
      board: "tooling",
      title: "CI cache",
      pinned: false,
      locked: false,
      votes: 0,
    });
    expect(thread.posts).toHaveLength(1);
    expect(thread.posts[0]).toMatchObject({
      id: `${thread.id}-root`,
      body: "Key the cache by compiler.",
    });
    expect(state.addedThreads).toHaveLength(2);
    expect(state.addedThreads[0]?.id).toBe(thread.id);
    // The server snapshot stays the initial one: SSR never sees session state.
    expect(store.boardServerSnapshot().addedThreads).toEqual([]);
  });

  it("notifies subscribers on a change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeBoard(listener);

    store.toggleThreadVote("tabs");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.toggleThreadVote("tabs");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("withLocalActivity", () => {
  it("counts session replies and takes their freshest activity", () => {
    const summaries = [
      summary("a", 2, "2026-09-17T00:00:00.000Z"),
      summary("b", 0, "2026-09-16T00:00:00.000Z"),
    ];
    store.addReply("a", "a-2", ada);
    const latest = store.addReply("a", "a-3", ada);

    const [first, second] = store.withLocalActivity(summaries, store.boardSnapshot().threads);
    expect(first).toMatchObject({ replies: 4, lastActivityAt: latest.createdAt });
    // A thread without session replies keeps its exact object.
    expect(second).toBe(summaries[1]);
  });

  it("drops tombstoned fixture and session replies from the count", () => {
    const summaries = [summary("a", 2, "2026-09-17T00:00:00.000Z")];
    const kept = store.addReply("a", "kept", ada);
    const dropped = store.addReply("a", "dropped", ada);
    store.deletePost("a", dropped.id);
    store.deletePost("a", "a-1");

    const [first] = store.withLocalActivity(summaries, store.boardSnapshot().threads);
    expect(first).toMatchObject({ replies: 2, lastActivityAt: kept.createdAt });
  });

  it("never drops the count below zero", () => {
    const summaries = [summary("a", 0, "2026-09-17T00:00:00.000Z")];
    store.deletePost("a", "a-1");
    store.deletePost("a", "a-2");

    const [first] = store.withLocalActivity(summaries, store.boardSnapshot().threads);
    expect(first).toMatchObject({ replies: 0 });
  });
});
