import { describe, expect, it } from "vitest";
import type { Thread, ThreadPost } from "@/features/board/model/threads";
import type { BoardState } from "@/features/board/data/board-store";
import {
  effectiveSearchThreads,
  resolveSearchVisibility,
  type SearchModeration,
} from "@/features/board/data/forum-search";
import { targetKey } from "@/features/moderation/contracts";

function post(id: string, body: string, user = "ada"): ThreadPost {
  return {
    id,
    author: { user, role: "member" },
    body,
    createdAt: "2026-09-10T12:00:00.000Z",
    votes: 0,
  };
}

function conversation(id: string, posts: ThreadPost[]): Thread {
  return {
    id,
    board: "general",
    title: `Thread ${id}`,
    author: { user: "ada", role: "member" },
    tags: ["question"],
    techs: ["c"],
    tagLabels: { question: "QUESTION", c: "C" },
    pinned: false,
    locked: false,
    createdAt: "2026-09-10T12:00:00.000Z",
    votes: 0,
    voted: false,
    posts,
  };
}

function boardState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    votedThreads: new Set(),
    unvotedThreads: new Set(),
    threads: {},
    flags: {},
    ...overrides,
  };
}

// The moderation snapshot below is a narrowed fixture: only the fields the
// visibility resolver reads (reports[].target.rootThreadId, hidden) are
// populated, the rest is an empty case shell.
function moderationWith(options: {
  hiddenPosts?: { id: string; note?: string }[];
  hiddenThreads?: string[];
}): SearchModeration {
  const hidden: Record<string, SearchModeration["hidden"][string]> = {};
  for (const entry of options.hiddenPosts ?? []) {
    hidden[targetKey({ kind: "post", id: entry.id })] = {
      note: entry.note ?? "",
      at: "2026-09-16T12:00:00.000Z",
      caseId: "case-1",
      permanent: false,
    };
  }
  const reports = (options.hiddenThreads ?? []).map((threadId) => ({
    target: { kind: "post", id: `${threadId}-root`, rootThreadId: threadId },
  }));
  // isThreadHidden pairs a root report with its hidden record: the thread
  // fixture hides both together.
  for (const threadId of options.hiddenThreads ?? []) {
    hidden[targetKey({ kind: "post", id: `${threadId}-root` })] = {
      note: "",
      at: "2026-09-16T12:00:00.000Z",
      caseId: "case-1",
      permanent: false,
    };
  }
  return {
    // Narrowed fixture: the resolver reads only reports[].target.rootThreadId,
    // so the remaining report fields stay unpopulated test data.
    reports: reports as unknown as SearchModeration["reports"],
    hidden,
    unavailable: new Set(),
    seenByAuthor: {},
    seenByReporter: {},
  };
}

describe("effectiveSearchThreads", () => {
  const corpus = [conversation("t1", [post("p1", "heap corruption"), post("p2", "cache keys")])];

  it("merges session replies, edits and deletions", () => {
    const state = boardState({
      threads: {
        t1: {
          votedPosts: new Set(),
          edits: new Map([["p1", "heap corruption, revised"]]),
          deletedPosts: new Set(["p2"]),
          addedPosts: [post("r1", "a session reply about heaps", "ken")],
        },
      },
    });
    const documents = effectiveSearchThreads(corpus, state);
    expect(documents.map((entry) => entry.id)).toEqual(["t1"]);
    const t1 = documents.find((entry) => entry.id === "t1");
    expect(t1?.posts.map((entry) => entry.id)).toEqual(["p1", "r1"]);
    expect(t1?.posts.find((entry) => entry.id === "p1")?.body).toBe("heap corruption, revised");
    expect(t1?.posts.find((entry) => entry.id === "r1")).toMatchObject({
      body: "a session reply about heaps",
      author: "ken",
    });
  });

  it("drops hidden threads and posts before matching", () => {
    const state = boardState();
    const moderation = moderationWith({ hiddenPosts: [{ id: "p1" }], hiddenThreads: ["t1"] });
    const stranger = resolveSearchVisibility(corpus, state, moderation, {
      user: "lin",
      admin: false,
    });
    expect(stranger.hiddenThreadIds.has("t1")).toBe(true);
    expect(
      effectiveSearchThreads(corpus, state, stranger).find((entry) => entry.id === "t1"),
    ).toBeUndefined();

    const withoutThreadHide = resolveSearchVisibility(
      corpus,
      state,
      moderationWith({ hiddenPosts: [{ id: "p1" }] }),
      { user: "lin", admin: false },
    );
    const documents = effectiveSearchThreads(corpus, state, withoutThreadHide);
    expect(documents.find((entry) => entry.id === "t1")?.posts.map((entry) => entry.id)).toEqual([
      "p2",
    ]);
  });

  it("keeps hidden material visible to admins and its author", () => {
    const state = boardState();
    const moderation = moderationWith({ hiddenPosts: [{ id: "p1" }], hiddenThreads: ["t1"] });
    for (const viewer of [
      { user: "root", admin: true },
      { user: "ada", admin: false },
    ]) {
      const visibility = resolveSearchVisibility(corpus, state, moderation, viewer);
      expect(visibility.hiddenThreadIds.size).toBe(0);
      expect(visibility.hiddenPostIds.size).toBe(0);
      expect(
        effectiveSearchThreads(corpus, state, visibility).find((entry) => entry.id === "t1")?.posts,
      ).toHaveLength(2);
    }
  });
});
