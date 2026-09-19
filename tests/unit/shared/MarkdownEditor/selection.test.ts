import { describe, expect, it } from "vitest";
import { insertAt, wrapCode, wrapFence, wrapRange } from "@/shared/MarkdownEditor/selection";

describe("editor selection edits", () => {
  it("wraps a selection and keeps it selected inside the pair", () => {
    expect(wrapRange("hello world", 6, 11, "**", "**")).toEqual({
      value: "hello **world**",
      start: 8,
      end: 13,
    });
  });

  it("leaves a collapsed caret between the pair on an empty range", () => {
    expect(wrapRange("hello", 5, 5, "**", "**")).toEqual({
      value: "hello****",
      start: 7,
      end: 7,
    });
  });

  it("wraps one line in a code span", () => {
    expect(wrapCode("call free(x)", 5, 12)).toEqual({
      value: "call `free(x)`",
      start: 6,
      end: 13,
    });
  });

  it("wraps many lines in a fence", () => {
    expect(wrapCode("a\nb", 0, 3)).toEqual({
      value: "```\na\nb\n```",
      start: 4,
      end: 7,
    });
  });

  it("fences one line for the block tool", () => {
    expect(wrapFence("free(ptr);", 0, 10)).toEqual({
      value: "```\nfree(ptr);\n```",
      start: 4,
      end: 14,
    });
  });

  it("inserts an image at the caret, replacing a selection", () => {
    expect(insertAt("see this", 4, 8, "![alt](https://x/y.png)")).toEqual({
      value: "see ![alt](https://x/y.png)",
      start: 27,
      end: 27,
    });
  });
});
