import { describe, expect, it } from "vitest";
import { excerpt } from "@/features/board/excerpt";

const MAX = 64;

describe("excerpt", () => {
  it("takes the first non-empty line and collapses its spaces", () => {
    expect(excerpt("First line.\n\nSecond line.", MAX)).toBe("First line.");
    expect(excerpt("\n\n  spaced   words \n\n", MAX)).toBe("spaced words");
  });

  it("strips headings, quotes and list markers", () => {
    expect(excerpt("## Heading here", MAX)).toBe("Heading here");
    expect(excerpt("> quoted words", MAX)).toBe("quoted words");
    expect(excerpt("- **By hand.** No AI.", MAX)).toBe("By hand. No AI.");
  });

  it("turns links into their text and images into their alt", () => {
    expect(excerpt("See [the RFC](https://example.com) for it.", MAX)).toBe("See the RFC for it.");
    expect(excerpt("![A moth in the log](/media/bug.jpg)", MAX)).toBe("A moth in the log");
  });

  it("skips a fence line down to the first line of text", () => {
    expect(excerpt("```ts\nconst x = 1;\n```", MAX)).toBe("const x = 1;");
  });

  it("returns an empty string when the body has no text", () => {
    expect(excerpt("", MAX)).toBe("");
    expect(excerpt("```\n```", MAX)).toBe("");
  });

  it("truncates long text to the budget with an ellipsis", () => {
    const result = excerpt("a".repeat(100), MAX);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(MAX);
  });
});
