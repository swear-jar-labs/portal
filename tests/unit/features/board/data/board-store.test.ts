import { beforeEach, describe, expect, it, vi } from "vitest";
import * as store from "@/features/board/data/board-store";
import type { BoardMember, ThreadPost, ThreadSummary } from "@/features/board/model/threads";

const ada: BoardMember = { user: "ada", role: "maintainer" };

function confirmedPost(
  id: string,
  body: string,
  createdAt = "2026-09-18T10:00:00.000Z",
  replyTo?: string,
): ThreadPost {
  return {
    id,
    author: ada,
    body,
    ...(replyTo === undefined ? {} : { replyTo }),
    createdAt,
    votes: 0,
  };
}

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
    techs: [],
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

  it("appends server-confirmed posts to their thread", () => {
    const post = confirmedPost("p-1", "Canaries first.");
    store.addConfirmedPost("a", post);
    store.addConfirmedPost("b", confirmedPost("p-2", "And the compiler version."));
    const state = store.boardSnapshot();
    expect(store.threadStateOf(state, "a").addedPosts).toEqual([post]);
    expect(store.threadStateOf(state, "b").addedPosts).toHaveLength(1);
  });

  it("keeps the confirmed post as given, parent included", () => {
    const linked = confirmedPost("p-1", "Same here.", "2026-09-18T10:00:00.000Z", "a-1");
    store.addConfirmedPost("a", linked);
    expect(store.threadStateOf(store.boardSnapshot(), "a").addedPosts).toEqual([linked]);
  });

  it("ignores a confirmed post with a known id", () => {
    const post = confirmedPost("p-1", "Canaries first.");
    store.addConfirmedPost("a", post);
    store.addConfirmedPost("a", { ...post, body: "Changed." });
    expect(store.threadStateOf(store.boardSnapshot(), "a").addedPosts).toEqual([post]);
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

  it("sets pin and lock flags independently per thread", () => {
    store.setThreadFlag("a", "pinned", true);
    store.setThreadFlag("a", "locked", true);
    store.setThreadFlag("b", "pinned", true);
    const state = store.boardSnapshot();

    expect(store.threadFlagOf(state, "a", "pinned")).toBe(true);
    expect(store.threadFlagOf(state, "a", "locked")).toBe(true);
    expect(store.threadFlagOf(state, "b", "pinned")).toBe(true);
    expect(store.threadFlagOf(state, "b", "locked")).toBeUndefined();

    store.setThreadFlag("a", "pinned", false);
    expect(store.threadFlagOf(store.boardSnapshot(), "a", "pinned")).toBe(false);
    expect(store.threadFlagOf(store.boardSnapshot(), "a", "locked")).toBe(true);
  });

  it("keeps an unknown thread without flags", () => {
    const state = store.boardSnapshot();
    expect(store.threadFlagOf(state, "nope", "pinned")).toBeUndefined();
    expect(store.threadFlagOf(state, "nope", "locked")).toBeUndefined();
  });
});

describe("withLocalActivity", () => {
  it("counts session replies and takes their freshest activity", () => {
    const summaries = [
      summary("a", 2, "2026-09-17T00:00:00.000Z"),
      summary("b", 0, "2026-09-16T00:00:00.000Z"),
    ];
    store.addConfirmedPost("a", confirmedPost("a-2", "second", "2026-09-18T10:00:00.000Z"));
    const latest = confirmedPost("a-3", "third", "2026-09-18T11:00:00.000Z");
    store.addConfirmedPost("a", latest);

    const [first, second] = store.withLocalActivity(summaries, store.boardSnapshot().threads);
    expect(first).toMatchObject({ replies: 4, lastActivityAt: latest.createdAt });
    // A thread without session replies keeps its exact object.
    expect(second).toBe(summaries[1]);
  });

  it("drops tombstoned fixture and session replies from the count", () => {
    const summaries = [summary("a", 2, "2026-09-17T00:00:00.000Z")];
    const kept = confirmedPost("kept", "kept", "2026-09-18T10:00:00.000Z");
    const dropped = confirmedPost("dropped", "dropped", "2026-09-18T11:00:00.000Z");
    store.addConfirmedPost("a", kept);
    store.addConfirmedPost("a", dropped);
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

  it("drops confirmed replies the server already echoes", () => {
    const summaries = [summary("a", 3, "2026-09-18T12:00:00.000Z")];
    store.addConfirmedPost("a", confirmedPost("echoed", "echoed", "2026-09-18T12:00:00.000Z"));
    store.addConfirmedPost("a", confirmedPost("fresh", "fresh", "2026-09-18T13:00:00.000Z"));

    const [echoed] = store.withLocalActivity(
      summaries,
      store.boardSnapshot().threads,
      new Map([["a", new Set(["echoed"])]]),
    );
    // The echoed reply stays in the server count only; the fresh one adds.
    expect(echoed).toMatchObject({ replies: 4, lastActivityAt: "2026-09-18T13:00:00.000Z" });

    const [both] = store.withLocalActivity(summaries, store.boardSnapshot().threads);
    expect(both).toMatchObject({ replies: 5 });
  });
});

describe("withSessionFlags", () => {
  it("replaces the set flags and keeps the rest of the summary", () => {
    const summaries = [
      summary("a", 2, "2026-09-17T00:00:00.000Z"),
      summary("b", 0, "2026-09-16T00:00:00.000Z"),
    ];
    store.setThreadFlag("a", "pinned", true);
    store.setThreadFlag("a", "locked", true);

    const [first, second] = store.withSessionFlags(summaries, store.boardSnapshot().flags);
    expect(first).toMatchObject({ pinned: true, locked: true, replies: 2 });
    // A thread without overrides keeps its exact object.
    expect(second).toBe(summaries[1]);
  });

  it("clears an override back to the fixture flag", () => {
    const summaries = [summary("a", 2, "2026-09-17T00:00:00.000Z")];
    store.setThreadFlag("a", "pinned", true);
    store.setThreadFlag("a", "pinned", false);

    const [first] = store.withSessionFlags(summaries, store.boardSnapshot().flags);
    expect(first).toBe(summaries[0]);
  });
});
