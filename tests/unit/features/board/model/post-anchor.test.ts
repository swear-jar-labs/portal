import { describe, expect, it } from "vitest";
import { postElementId, postHash, postIdFromHash } from "@/features/board/model/post-anchor";

describe("post anchors", () => {
  it("round-trips an id through the hash", () => {
    expect(postIdFromHash(postHash("read-first-2"))).toBe("read-first-2");
    expect(postHash("read-first-2")).toBe(`#${postElementId("read-first-2")}`);
  });

  it("rejects a foreign or empty hash", () => {
    expect(postIdFromHash("#section")).toBeUndefined();
    expect(postIdFromHash("#board-post-")).toBeUndefined();
    expect(postIdFromHash("")).toBeUndefined();
  });
});
