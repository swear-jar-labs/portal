import { describe, expect, it } from "vitest";
import type { Readroom } from "@/features/readroom/model/readrooms";
import {
  filterReadroomTags,
  parseReadroomQuery,
  readroomQueryParams,
  sameReadroomQuery,
  searchFragment,
  searchReadrooms,
  searchTerms,
} from "@/features/readroom/model/search";

const deadline = "2026-09-16T12:00:00.000Z";
const task: Readroom = {
  id: "demo",
  title: "A retry loop",
  description: "The `switch` dispatches retries.",
  tags: ["go", "linux"],
  lead: { user: "ada" },
  createdAt: "2026-09-15T12:00:00.000Z",
  deadlineAt: deadline,
  upvotes: [],
  notes: [
    {
      id: "n1",
      author: { user: "ada" },
      body: "sealed_unique_value in `sleep`",
      createdAt: "2026-09-15T13:00:00.000Z",
    },
  ],
  report: "published_unique_value after review",
  archivedAt: "2026-09-15T14:00:00.000Z",
};
const visibility = { hiddenNoteIds: new Set<string>(), revisionBodies: new Map<string, string>() };
const before = "2026-09-16T11:59:59.999Z";

describe("readroom mock search", () => {
  it("normalizes AND terms within one field and renders overlapping hits once", () => {
    expect(searchTerms("  LOOP   retry loop ")).toEqual(["loop", "retry"]);
    expect(
      searchReadrooms([task], "retry loop", deadline, visibility).map((hit) => hit.kind),
    ).toEqual(["title"]);
    const fragment = searchFragment("heap corruption", ["heap", "heap corruption"]);
    expect(fragment?.segments.map((part) => part.text).join("")).toBe("heap corruption");
    expect(fragment?.segments.filter((part) => part.hit).map((part) => part.text)).toEqual([
      "heap corruption",
    ]);
    expect(searchFragment("<script>hi</script>", ["<script>"])?.segments[0]?.text).toBe("<script>");
    expect(searchFragment("İx", ["x"])?.segments).toEqual([
      { text: "İ", hit: false },
      { text: "x", hit: true },
    ]);
    expect(searchFragment("x".repeat(200), ["x".repeat(200)])?.segments).toEqual([
      { text: "x".repeat(200), hit: true },
    ]);
  });

  it("keeps fragment windows on code point boundaries", () => {
    // The window start (first hit minus 60) lands on the emoji's low surrogate.
    const cutStart = `${"a".repeat(5)}😀${"b".repeat(59)}needle`;
    const startFragment = searchFragment(cutStart, ["needle"]);
    expect(startFragment?.segments.map((part) => part.text).join("")).toContain("😀");
    // The window end (start plus 160) lands on the emoji's low surrogate.
    const cutEnd = `needle${"x".repeat(153)}😀tail`;
    const endFragment = searchFragment(cutEnd, ["needle"]);
    expect(endFragment?.segments.map((part) => part.text).join("")).toContain("😀");
  });

  it("never indexes sealed notes even for their author, admin or an archive", () => {
    expect(searchReadrooms([task], "sealed_unique_value", before, visibility)).toEqual([]);
    expect(searchReadrooms([task], "sealed_unique_value", deadline, visibility)[0]?.noteId).toBe(
      "n1",
    );
    expect(searchReadrooms([task], "published_unique_value", before, visibility)[0]?.kind).toBe(
      "report",
    );
  });

  it("reads live revisions and removes hidden or deleted notes before matching", () => {
    const revised = {
      hiddenNoteIds: new Set<string>(),
      revisionBodies: new Map([["n1", "new_unique_value"]]),
    };
    expect(searchReadrooms([task], "sealed_unique_value", deadline, revised)).toEqual([]);
    expect(searchReadrooms([task], "new_unique_value", deadline, revised)).toHaveLength(1);
    expect(
      searchReadrooms([task], "new_unique_value", deadline, {
        ...revised,
        hiddenNoteIds: new Set(["n1"]),
      }),
    ).toEqual([]);
    expect(
      searchReadrooms([{ ...task, notes: [] }], "new_unique_value", deadline, revised),
    ).toEqual([]);
  });

  it("compares queries, caps terms and keeps every task without tags", () => {
    const base = { q: "retry", mode: "top" as const, tags: [] as const };
    expect(sameReadroomQuery(base, { q: "retry", mode: "top", tags: [] })).toBe(true);
    expect(sameReadroomQuery(base, { q: "retry!", mode: "top", tags: [] })).toBe(false);
    expect(sameReadroomQuery(base, { q: "retry", mode: "new", tags: [] })).toBe(false);
    expect(
      sameReadroomQuery(
        { q: "retry", mode: "new", tags: ["go", "linux"] },
        { q: "retry", mode: "new", tags: ["linux", "go"] },
      ),
    ).toBe(false);
    expect(searchTerms("w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w12")).toEqual([
      "w1",
      "w2",
      "w3",
      "w4",
      "w5",
      "w6",
      "w7",
      "w8",
      "w9",
      "w10",
    ]);
    expect(filterReadroomTags([task], [])).toEqual([task]);
  });

  it("uses all selected tags with an exact URL round trip", () => {
    const query = { q: "retry loop", mode: "new" as const, tags: ["go", "linux"] as const };
    expect(parseReadroomQuery(readroomQueryParams(query))).toEqual(query);
    expect(filterReadroomTags([task], ["go", "linux"])).toEqual([task]);
    expect(filterReadroomTags([task], ["go", "rust"])).toEqual([]);
    expect(parseReadroomQuery(new URLSearchParams("mode=bad&tag=bad&q=x"))).toEqual({
      q: "x",
      mode: "top",
      tags: [],
    });
  });
});
