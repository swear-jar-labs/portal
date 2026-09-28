import { describe, expect, it } from "vitest";
import { composeSchema, replySchema } from "@/features/board/model/schema";
import { tagIds, threadTechIds } from "@/features/board/model/threads";
import { MAX_TAGS } from "@/lib/tags";

const validCompose = {
  board: "general",
  tags: ["question"],
  techs: ["c"],
  title: "Postmortem: heap corruption at 3am",
  body: "The fix was one line; the search was six hours.",
};

describe("composeSchema", () => {
  it("accepts a thread and trims its text", () => {
    const parsed = composeSchema.parse({ ...validCompose, title: "  Tabs  ", body: "  Done. " });
    expect(parsed).toEqual({ ...validCompose, title: "Tabs", body: "Done." });
  });

  it("accepts a thread without tags", () => {
    expect(composeSchema.safeParse({ ...validCompose, tags: [], techs: [] }).success).toBe(true);
  });

  it("rejects blank fields", () => {
    expect(composeSchema.safeParse({ ...validCompose, title: "   " }).success).toBe(false);
    expect(composeSchema.safeParse({ ...validCompose, body: "\n" }).success).toBe(false);
  });

  it("rejects an unknown board and unknown tags", () => {
    expect(composeSchema.safeParse({ ...validCompose, board: "errata-old" }).success).toBe(false);
    expect(composeSchema.safeParse({ ...validCompose, tags: ["nope"] }).success).toBe(false);
    expect(composeSchema.safeParse({ ...validCompose, techs: ["brainfuck"] }).success).toBe(false);
  });

  it("writes to a project journal but not to the archive", () => {
    expect(composeSchema.safeParse({ ...validCompose, board: "compiler" }).success).toBe(true);
    expect(composeSchema.safeParse({ ...validCompose, board: "token-cache" }).success).toBe(false);
  });

  it("caps tags at the shared limit", () => {
    // The status vocabulary (2) fits under the cap: the whole list passes,
    // eleven chips do not (duplicates count — the board takes them as given).
    expect(composeSchema.safeParse({ ...validCompose, tags: [...tagIds] }).success).toBe(true);
    const eleven = Array<string>(11).fill("question");
    expect(eleven).toHaveLength(11);
    expect(composeSchema.safeParse({ ...validCompose, tags: eleven }).success).toBe(false);
  });

  it("caps techs at the shared limit", () => {
    // The tech vocabulary (22) reaches the cap: ten pass, eleven do not.
    const ten = [...threadTechIds.slice(0, MAX_TAGS)];
    expect(ten).toHaveLength(MAX_TAGS);
    expect(composeSchema.safeParse({ ...validCompose, techs: ten }).success).toBe(true);
    const overflow = threadTechIds[MAX_TAGS];
    if (overflow === undefined) throw new Error("the tech catalog is shorter than the cap");
    expect(composeSchema.safeParse({ ...validCompose, techs: [...ten, overflow] }).success).toBe(
      false,
    );
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
