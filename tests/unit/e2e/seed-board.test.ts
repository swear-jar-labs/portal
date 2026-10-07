import { z } from "zod";
import { describe, expect, test } from "vitest";

import { tagIds, threadTechIds } from "@/features/board/model/threads";
import { E2E_FIXTURE_HANDLES } from "../../e2e/e2e-accounts";
import { SEED_SECTIONS, SEED_THREADS, seedPostId, seedThreadId } from "../../e2e/seed-board";

const uuidSchema = z.string().uuid();

// The board seed is the contract the board spec navigates by: fixed UUIDs,
// resolvable reply targets and a taxonomy the model accepts. A typo here is
// a 404 or a misranked feed, so the canon pins itself.
describe("board seed canon", () => {
  test("threads carry unique keys and valid UUIDs", () => {
    const keys = SEED_THREADS.map((thread) => thread.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const thread of SEED_THREADS) {
      expect(uuidSchema.safeParse(thread.id).success, thread.key).toBe(true);
      expect(seedThreadId(thread.key)).toBe(thread.id);
    }
  });

  test("posts carry unique keys and valid UUIDs and resolve their reply targets", () => {
    const posts = SEED_THREADS.flatMap((thread) =>
      thread.posts.map((post) => ({ thread: thread.key, ...post })),
    );
    const keys = posts.map((post) => post.key);
    expect(new Set(keys).size).toBe(keys.length);
    const ids = posts.map((post) => post.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const post of posts) {
      expect(uuidSchema.safeParse(post.id).success, post.key).toBe(true);
      expect(seedPostId(post.key)).toBe(post.id);
      if (post.replyTo === undefined) continue;
      const parent = posts.find((candidate) => candidate.key === post.replyTo);
      expect(parent, `${post.key} answers ${post.replyTo}`).toBeDefined();
      expect(parent?.thread).toBe(post.thread);
    }
  });

  test("threads sit on seeded sections with harness authors", () => {
    const slugs = SEED_SECTIONS.map((section) => section.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const handles = new Set<string>(E2E_FIXTURE_HANDLES);
    for (const thread of SEED_THREADS) {
      expect(slugs, thread.key).toContain(thread.board);
      expect(handles.has(thread.author), thread.key).toBe(true);
      for (const post of thread.posts) {
        expect(handles.has(post.author), post.key).toBe(true);
        expect(Number.isNaN(Date.parse(post.createdAt)), post.key).toBe(false);
      }
    }
  });

  test("tags and techs stay inside the board vocabulary", () => {
    for (const thread of SEED_THREADS) {
      for (const tag of thread.tags) {
        expect(tagIds, `${thread.key} tag ${tag}`).toContain(tag);
      }
      for (const tech of thread.techs) {
        expect(threadTechIds, `${thread.key} tech ${tech}`).toContain(tech);
      }
    }
  });

  test("timestamps order the activity the feed ranks by", () => {
    for (const thread of SEED_THREADS) {
      const stamps = thread.posts.map((post) => Date.parse(post.createdAt));
      const ordered = [...stamps].sort((a, b) => a - b);
      expect(stamps, thread.key).toEqual(ordered);
      expect(Date.parse(thread.createdAt), thread.key).toBeLessThanOrEqual(
        stamps[0] ?? Date.parse(thread.createdAt),
      );
    }
  });

  test("vote tallies fit the harness roster", () => {
    const pool = E2E_FIXTURE_HANDLES.length;
    for (const thread of SEED_THREADS) {
      expect(thread.votes, thread.key).toBeLessThanOrEqual(pool);
      for (const post of thread.posts) {
        expect(post.votes, post.key).toBeLessThanOrEqual(pool);
      }
    }
  });
});
