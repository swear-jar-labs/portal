import { describe, expect, it } from "vitest";
import { docIds, docs } from "@/content/docs";

describe("docs content", () => {
  it("loads every registered doc id exactly once, in order", () => {
    expect(docs.map((doc) => doc.id)).toEqual([...docIds]);
  });

  it("gives every doc a non-empty body", () => {
    for (const doc of docs) {
      expect(doc.body.trim().length, `${doc.id} has an empty body`).toBeGreaterThan(0);
    }
  });
});
