import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getBoardMember,
  getThread,
  listRecentThreadSummariesByBoard,
  listThreadSummariesByAuthor,
  listThreads,
} from "@/features/board/data";
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

  it("resolves public members from posts and keeps each author's role consistent", async () => {
    const firstAuthors = new Map<string, { user: string; role: string; avatar?: string }>();

    for (const summary of await listThreads()) {
      const thread = await getThread(summary.id);
      if (!thread) throw new Error(`${summary.id} disappeared`);
      for (const post of thread.posts) {
        const first = firstAuthors.get(post.author.user);
        if (first) {
          expect(post.author.role, `${post.id} changes ${post.author.user}'s role`).toBe(
            first.role,
          );
        } else {
          firstAuthors.set(post.author.user, post.author);
        }
      }
    }

    expect(await getBoardMember("ada")).toEqual(firstAuthors.get("ada"));
    expect(await getBoardMember("nobody")).toBeNull();
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

describe("listRecentThreadSummariesByBoard", () => {
  const now = Date.parse("2026-09-20T00:00:00.000Z");

  it("returns pinned first, then the freshest, within the limit", async () => {
    const summaries = await listRecentThreadSummariesByBoard("general", 3, now);
    expect(summaries.map((thread) => thread.id)).toEqual([
      "by-hand-ritual",
      "read-first",
      "heap-postmortem",
    ]);
  });

  it("reads a project journal in freshness order", async () => {
    const summaries = await listRecentThreadSummariesByBoard("swearjar-dos", 3, now);
    expect(summaries.map((thread) => thread.id)).toEqual(["swearjar-boot", "swearjar-palette"]);
  });

  it("returns an empty journal for a board without threads", async () => {
    expect(await listRecentThreadSummariesByBoard("flagship", 3, now)).toEqual([]);
  });
});
