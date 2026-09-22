import { describe, expect, it } from "vitest";
import { MAX_TAGS, toggleTagSelection } from "@/lib/tags";

const full = Array.from({ length: MAX_TAGS }, (_, index) => `tag-${index}`);

describe("tag selection", () => {
  it("adds up to the shared cap without replacing existing tags", () => {
    expect(full).toHaveLength(MAX_TAGS);
    expect(toggleTagSelection(full, "tag-extra")).toEqual(full);
    expect(toggleTagSelection([], "tag-0")).toEqual(["tag-0"]);
    expect(full).toEqual(Array.from({ length: MAX_TAGS }, (_, index) => `tag-${index}`));
  });

  it("lets a selected tag go at the cap and frees a place", () => {
    const removed = toggleTagSelection(full, full[1]);
    expect(removed).toEqual(full.filter((_, index) => index !== 1));
    expect(toggleTagSelection(removed, "tag-extra")).toEqual([...removed, "tag-extra"]);
  });
});
