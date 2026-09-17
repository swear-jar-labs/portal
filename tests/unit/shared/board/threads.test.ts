import { describe, expect, it } from "vitest";
import { messages } from "@/content/messages";
import {
  boardIds,
  formatAge,
  getThread,
  isBoardId,
  isTagId,
  listThreadSummariesByAuthor,
  listThreads,
  tagIds,
  tagTones,
  threadPath,
} from "@/shared/board/threads";

describe("board taxonomy", () => {
  it("keeps a label for every board and tag", () => {
    expect(Object.keys(messages.board.boards).sort()).toEqual([...boardIds].sort());
    expect(Object.keys(messages.board.tags).sort()).toEqual([...tagIds].sort());
  });

  it("gives every tone to a known tag", () => {
    for (const [tag, tone] of Object.entries(tagTones)) {
      expect(tagIds, `${tag} is toned but unknown`).toContain(tag);
      expect(tone).toBeTypeOf("string");
    }
  });

  it("guards the board and tag ids", () => {
    expect(isBoardId("tooling")).toBe(true);
    expect(isBoardId("nope")).toBe(false);
    expect(isTagId("proposal")).toBe(true);
    expect(isTagId("nope")).toBe(false);
  });

  it("owns the thread URL canon", () => {
    expect(threadPath("read-first")).toBe("/discussions/read-first");
  });
});

describe("board fixtures", () => {
  it("keeps thread ids unique and resolvable", async () => {
    const threads = await listThreads();
    const ids = threads.map((thread) => thread.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(await getThread(id), `${id} is not resolvable`).not.toBeNull();
    }
    expect(await getThread("no-such-thread")).toBeNull();
  });

  it("derives counters and activity from the posts", async () => {
    const summaries = new Map((await listThreads()).map((thread) => [thread.id, thread]));
    for (const id of summaries.keys()) {
      const thread = await getThread(id);
      if (!thread) throw new Error(`${id} disappeared`);
      const summary = summaries.get(id);
      if (!summary) throw new Error(`${id} has no summary`);

      expect(summary.replies).toBe(Math.max(0, thread.posts.length - 1));
      expect(summary.replies).toBeGreaterThanOrEqual(0);
      expect(summary.lastActivityAt).toBe(thread.posts.at(-1)?.createdAt ?? thread.createdAt);
      expect(summary.votes).toBe(thread.votes);
    }
  });

  it("keeps posts in chronological order", async () => {
    for (const id of (await listThreads()).map((thread) => thread.id)) {
      const thread = await getThread(id);
      if (!thread) continue;
      const times = thread.posts.map((post) => Date.parse(post.createdAt));
      expect(times, `${id} posts are out of order`).toEqual([...times].sort((a, b) => a - b));
      const created = Date.parse(thread.createdAt);
      for (const time of times) {
        expect(time, `${id} has a post before its creation`).toBeGreaterThanOrEqual(created);
      }
    }
  });

  it("keeps every thread on a known board with known tags", async () => {
    for (const summary of await listThreads()) {
      expect(boardIds, `${summary.id} has an unknown board`).toContain(summary.board);
      for (const tag of summary.tags) {
        expect(tagIds, `${summary.id} has an unknown tag`).toContain(tag);
      }
      expect(summary.votes).toBeGreaterThanOrEqual(0);
    }
  });

  it("holds the states the feed and the thread page render", async () => {
    const threads = await listThreads();
    expect(threads.some((thread) => thread.pinned)).toBe(true);
    expect(threads.some((thread) => thread.locked)).toBe(true);

    const empty = await getThread("withdrawn-call");
    expect(empty?.posts).toHaveLength(0);

    // ada (the Google demo user) authors threads: the profile section needs them.
    expect(threads.some((thread) => thread.author.user === "ada")).toBe(true);
  });
});

describe("listThreadSummariesByAuthor", () => {
  it("returns the author's threads with the freshest activity first", async () => {
    const summaries = await listThreadSummariesByAuthor("ada");
    expect(summaries.map((thread) => thread.id)).toEqual([
      "ci-cache-poisoning",
      "read-first",
      "no-ai-commits",
    ]);
    for (const summary of summaries) {
      expect(summary.author.user).toBe("ada");
    }
  });

  it("returns an empty list for a member without threads", async () => {
    expect(await listThreadSummariesByAuthor("nobody")).toEqual([]);
  });
});

describe("formatAge", () => {
  const now = "2026-09-16T12:00:00.000Z";

  it("reads young ages as JUST NOW", () => {
    expect(formatAge("2026-09-16T11:59:30.000Z", now)).toBe("JUST NOW");
    expect(formatAge("not-a-date", now)).toBe("JUST NOW");
  });

  it("formats minutes, hours, days and weeks", () => {
    expect(formatAge("2026-09-16T11:30:00.000Z", now)).toBe("30M AGO");
    expect(formatAge("2026-09-16T09:00:00.000Z", now)).toBe("3H AGO");
    expect(formatAge("2026-09-13T12:00:00.000Z", now)).toBe("3D AGO");
    expect(formatAge("2026-09-01T12:00:00.000Z", now)).toBe("2W AGO");
  });
});
