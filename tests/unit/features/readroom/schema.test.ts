import { describe, expect, it } from "vitest";
import { MAX_TAGS } from "@/lib/tags";
import { noteSchema, readroomSchema, reportSchema } from "@/features/readroom/schema";
import { readroomTagIds } from "@/features/readroom/readrooms";

const validTask = {
  title: "Read the parser",
  tags: ["c"],
  description: "Where the table lies.",
  deadline: "2026-10-01T18:00",
};

describe("noteSchema", () => {
  it("accepts and trims a note", () => {
    expect(noteSchema.parse({ body: "  Confirmed by instrumenting.  " })).toEqual({
      body: "Confirmed by instrumenting.",
    });
  });

  it("rejects a blank note and an oversized one", () => {
    expect(noteSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(noteSchema.safeParse({ body: "x".repeat(4001) }).success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("accepts and trims a write-up", () => {
    expect(reportSchema.parse({ body: "  ## What the code does  " })).toEqual({
      body: "## What the code does",
    });
  });

  it("rejects a blank write-up", () => {
    expect(reportSchema.safeParse({ body: "\n" }).success).toBe(false);
  });
});

describe("readroomSchema", () => {
  it("accepts a task and trims the text fields", () => {
    const parsed = readroomSchema.parse({ ...validTask, title: "  Read the parser  " });
    expect(parsed.title).toBe("Read the parser");
  });

  it("accepts a snippet with no source URL at all", () => {
    const parsed = readroomSchema.safeParse(validTask);
    expect(parsed.success).toBe(true);
  });

  it("rejects blank required fields", () => {
    expect(readroomSchema.safeParse({ ...validTask, title: " " }).success).toBe(false);
    expect(readroomSchema.safeParse({ ...validTask, description: "\n" }).success).toBe(false);
    expect(readroomSchema.safeParse({ ...validTask, deadline: "" }).success).toBe(false);
  });

  it("takes http(s) source URLs only", () => {
    expect(
      readroomSchema.safeParse({ ...validTask, sourceUrl: "https://github.com/a/b/blob/abc/x.c" })
        .success,
    ).toBe(true);
    expect(
      readroomSchema.safeParse({ ...validTask, sourceUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(readroomSchema.safeParse({ ...validTask, sourceUrl: "not a url" }).success).toBe(false);
  });

  it("caps tags at the shared limit and knows the taxonomy", () => {
    expect(
      readroomSchema.safeParse({ ...validTask, tags: readroomTagIds.slice(0, MAX_TAGS) }).success,
    ).toBe(true);
    expect(
      readroomSchema.safeParse({ ...validTask, tags: readroomTagIds.slice(0, MAX_TAGS + 1) })
        .success,
    ).toBe(false);
    expect(readroomSchema.safeParse({ ...validTask, tags: ["zig"] }).success).toBe(false);
  });

  it("rejects a duplicated tag", () => {
    expect(readroomSchema.safeParse({ ...validTask, tags: ["c", "c"] }).success).toBe(false);
  });
});
