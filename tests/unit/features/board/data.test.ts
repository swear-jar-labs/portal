import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getThread, listThreadSummariesByAuthor, listThreads } from "@/features/board/data";
import { boardIds, tagIds } from "@/features/board/threads";

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

  it("keeps every bundled post image on disk", async () => {
    for (const id of (await listThreads()).map((thread) => thread.id)) {
      const thread = await getThread(id);
      if (!thread) continue;
      for (const post of thread.posts) {
        for (const match of post.body.matchAll(/!\[[^\]]*\]\((\/[^)]+)\)/g)) {
          const src = match[1];
          if (!src) continue;
          expect(existsSync(path.join(process.cwd(), "public", src)), `${post.id}: ${src}`).toBe(
            true,
          );
        }
      }
    }
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
