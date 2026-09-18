import { describe, expect, it } from "vitest";
import { composeSchema, replySchema } from "@/features/board/schema";

const validCompose = {
  board: "general",
  tags: ["craft"],
  title: "Postmortem: heap corruption at 3am",
  body: "The fix was one line; the search was six hours.",
};

describe("composeSchema", () => {
  it("accepts a thread and trims its text", () => {
    const parsed = composeSchema.parse({ ...validCompose, title: "  Tabs  ", body: "  Done. " });
    expect(parsed).toEqual({ ...validCompose, title: "Tabs", body: "Done." });
  });

  it("accepts a thread without tags", () => {
    expect(composeSchema.safeParse({ ...validCompose, tags: [] }).success).toBe(true);
  });

  it("rejects blank fields", () => {
    expect(composeSchema.safeParse({ ...validCompose, title: "   " }).success).toBe(false);
    expect(composeSchema.safeParse({ ...validCompose, body: "\n" }).success).toBe(false);
  });

  it("rejects an unknown board and unknown tags", () => {
    expect(composeSchema.safeParse({ ...validCompose, board: "errata-old" }).success).toBe(false);
    expect(composeSchema.safeParse({ ...validCompose, tags: ["nope"] }).success).toBe(false);
  });

  it("caps tags at three", () => {
    expect(
      composeSchema.safeParse({ ...validCompose, tags: ["craft", "meta", "question"] }).success,
    ).toBe(true);
    expect(
      composeSchema.safeParse({ ...validCompose, tags: ["craft", "meta", "question", "tooling"] })
        .success,
    ).toBe(false);
  });

  it("rejects an oversized title and body", () => {
    expect(composeSchema.safeParse({ ...validCompose, title: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(composeSchema.safeParse({ ...validCompose, body: "x".repeat(4001) }).success).toBe(
      false,
    );
  });
});

describe("replySchema", () => {
  it("accepts and trims a reply", () => {
    expect(replySchema.parse({ body: "  Canaries first.  " })).toEqual({ body: "Canaries first." });
  });

  it("rejects a blank reply and an oversized one", () => {
    expect(replySchema.safeParse({ body: "   " }).success).toBe(false);
    expect(replySchema.safeParse({ body: "x".repeat(4001) }).success).toBe(false);
  });
});
