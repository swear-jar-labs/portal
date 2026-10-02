import { describe, expect, it } from "vitest";
import { docIds } from "@/content/docs";
import { docPaths } from "@/features/home/DocPage";

describe("doc routes", () => {
  it("routes every doc except ABOUT, which lives on `/`", () => {
    expect(Object.keys(docPaths).sort()).toEqual(docIds.filter((id) => id !== "ABOUT").sort());
  });
});
