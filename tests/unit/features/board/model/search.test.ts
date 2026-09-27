import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_TERMS,
  MAX_VISIBLE_MATCHES_PER_THREAD,
  SEARCH_FRAGMENT_MAX_LENGTH,
  buildSearchFragment,
  findTermRanges,
  isBlankSearch,
  matchSearchThread,
  matchesAllTerms,
  mergeTermRanges,
  searchThreads,
  splitSearchTerms,
  type SearchablePost,
  type SearchableThread,
} from "@/features/board/model/search";

const STAMP = "2026-09-10T12:00:00.000Z";

function post(id: string, body: string, author?: string): SearchablePost {
  return { id, body, createdAt: STAMP, ...(author === undefined ? {} : { author }) };
}

function thread(
  overrides: Partial<SearchableThread> & Pick<SearchableThread, "id">,
): SearchableThread {
  return { title: "Untitled", createdAt: STAMP, posts: [], ...overrides };
}

describe("splitSearchTerms", () => {
  it("lowercases, trims and splits on whitespace", () => {
    expect(splitSearchTerms("  Heap  REALLOC ")).toEqual(["heap", "realloc"]);
  });

  it("dedupes and caps the term count", () => {
    const query = ["heap", "heap", ...Array.from({ length: 20 }, (_, index) => `w${index}`)].join(
      " ",
    );
    const terms = splitSearchTerms(query);
    expect(terms).toHaveLength(MAX_SEARCH_TERMS);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("treats blank queries as no search", () => {
    expect(isBlankSearch("")).toBe(true);
    expect(isBlankSearch("   ")).toBe(true);
    expect(isBlankSearch("heap")).toBe(false);
  });
});

describe("matchesAllTerms", () => {
  it("requires every term in the same field", () => {
    expect(matchesAllTerms("heap corruption at 3am", ["heap", "3am"])).toBe(true);
    expect(matchesAllTerms("heap corruption", ["heap", "realloc"])).toBe(false);
  });

  it("matches code text as ordinary text", () => {
    expect(matchesAllTerms("buf = realloc(buf, len);", ["realloc(buf"])).toBe(true);
  });
});

describe("findTermRanges", () => {
  it("collects every occurrence in order", () => {
    expect(findTermRanges("heap heap", ["heap"])).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 9 },
    ]);
  });
});

describe("mergeTermRanges", () => {
  it("merges a term nested inside another", () => {
    expect(
      mergeTermRanges([
        { start: 0, end: 4 },
        { start: 0, end: 15 },
      ]),
    ).toEqual([{ start: 0, end: 15 }]);
  });

  it("merges partially overlapping hits and keeps the rest", () => {
    expect(
      mergeTermRanges([
        { start: 0, end: 2 },
        { start: 1, end: 3 },
        { start: 10, end: 14 },
      ]),
    ).toEqual([
      { start: 0, end: 3 },
      { start: 10, end: 14 },
    ]);
  });
});

describe("buildSearchFragment", () => {
  it("marks the hits and trims the window with an ellipsis", () => {
    const body = `${"filler ".repeat(30)}heap corruption${" trailer".repeat(30)}`;
    const ranges = findTermRanges(body.toLowerCase(), ["heap"]);
    const fragment = buildSearchFragment(body, ranges);
    expect(fragment.truncatedBefore).toBe(true);
    expect(fragment.truncatedAfter).toBe(true);
    expect(fragment.text.length).toBeLessThanOrEqual(SEARCH_FRAGMENT_MAX_LENGTH + 2);
    const hits = fragment.segments.filter((segment) => segment.hit);
    expect(hits.map((segment) => segment.text)).toEqual(["heap"]);
    // The segments rejoin to the visible text (minus the ellipsis marks).
    expect(fragment.segments.map((segment) => segment.text).join("")).toContain("heap corruption");
  });

  it("keeps short bodies whole and untrimmed", () => {
    const fragment = buildSearchFragment("Short body.", [{ start: 0, end: 5 }]);
    expect(fragment.truncatedBefore).toBe(false);
    expect(fragment.truncatedAfter).toBe(false);
    expect(fragment.segments).toEqual([
      { text: "Short", hit: true },
      { text: " body.", hit: false },
    ]);
  });

  it("never parses the body as HTML", () => {
    const body = "<script>alert(1)</script> heap";
    const fragment = buildSearchFragment(body, findTermRanges(body.toLowerCase(), ["heap"]));
    expect(fragment.segments.every((segment) => !segment.text.includes("<mark"))).toBe(true);
    expect(fragment.segments.filter((segment) => segment.hit).map((s) => s.text)).toEqual(["heap"]);
  });

  it("renders nested terms once, without repeating the shared text", () => {
    const body = "heap corruption at 3am";
    const fragment = buildSearchFragment(
      body,
      findTermRanges(body.toLowerCase(), ["heap", "heap corruption"]),
    );
    expect(fragment.segments.map((segment) => segment.text).join("")).toBe(body);
    expect(fragment.segments.filter((segment) => segment.hit).map((s) => s.text)).toEqual([
      "heap corruption",
    ]);
  });
});

describe("matchSearchThread", () => {
  const heap = thread({
    id: "heap-postmortem",
    title: "Postmortem: heap corruption at 3am",
    posts: [
      post("p1", "The crash was a free() on a stale pointer."),
      post("p2", "buf = realloc(buf, len + extra); old_buf is now stale"),
    ],
  });

  it("finds titles and opening posts alike", () => {
    expect(matchSearchThread(heap, ["postmortem"])?.matches[0]?.postId).toBeUndefined();
    const reply = matchSearchThread(heap, ["free()"]);
    expect(reply?.matches.map((match) => match.postId)).toEqual(["p1"]);
  });

  it("finds code inside replies", () => {
    const hit = matchSearchThread(heap, ["realloc"]);
    expect(hit?.matches.map((match) => match.postId)).toEqual(["p2"]);
    expect(hit?.matches[0]?.author).toBeUndefined();
  });

  it("carries the reply author for the jump label", () => {
    const authored = thread({
      id: "t",
      title: "Nope",
      posts: [post("p1", "heap here", "ken")],
    });
    expect(matchSearchThread(authored, ["heap"])?.matches[0]).toMatchObject({
      postId: "p1",
      author: "ken",
    });
  });

  it("orders title first, then posts in thread order", () => {
    const hit = matchSearchThread(heap, ["stale"]);
    expect(hit?.matches.map((match) => match.postId)).toEqual(["p1", "p2"]);
  });

  it("caps the visible matches but keeps the total", () => {
    const many = thread({
      id: "t",
      title: "heap",
      posts: Array.from({ length: 6 }, (_, index) => post(`p${index}`, "heap heap")),
    });
    const hit = matchSearchThread(many, ["heap"]);
    expect(hit?.matches).toHaveLength(MAX_VISIBLE_MATCHES_PER_THREAD);
    expect(hit?.totalMatches).toBe(7);
  });

  it("returns null without all-terms coverage", () => {
    expect(matchSearchThread(heap, ["heap", "unicorn"])).toBeNull();
    expect(matchSearchThread(heap, [])).toBeNull();
  });
});

describe("searchThreads", () => {
  const threads = [
    thread({ id: "a", title: "Heap notes", posts: [post("a1", "nothing here")] }),
    thread({ id: "b", title: "Cache keys", posts: [post("b1", "heap smells wrong")] }),
  ];

  it("groups one hit per matching thread", () => {
    const hits = searchThreads(threads, "heap");
    expect(hits.map((hit) => hit.threadId)).toEqual(["a", "b"]);
  });

  it("returns nothing for blank queries", () => {
    expect(searchThreads(threads, "   ")).toEqual([]);
  });

  it("treats special characters as plain text", () => {
    const hits = searchThreads(threads, "C++ (heap)");
    expect(hits).toEqual([]);
    const code = thread({ id: "c", title: "t", posts: [post("c1", "a[i++] (heap)")] });
    expect(searchThreads([code], "(heap)").map((hit) => hit.threadId)).toEqual(["c"]);
  });
});
