import { describe, expect, it } from "vitest";
import { clampIndex, typeaheadIndex } from "../../components/Select/keyboard";

describe("clampIndex", () => {
  it("keeps the index inside the list", () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(3, 3)).toBe(2);
  });
});

describe("typeaheadIndex", () => {
  const labels = ["Learner", "Maintainer", "Reviewer"];

  it("walks to the next label starting with the typed letter", () => {
    expect(typeaheadIndex(labels, 0, "r")).toBe(2);
    expect(typeaheadIndex(labels, 2, "l")).toBe(0);
  });

  it("cycles through several matches", () => {
    const labels = ["Mercury", "Mars", "Venus"];
    expect(typeaheadIndex(labels, 0, "m")).toBe(1);
    expect(typeaheadIndex(labels, 1, "m")).toBe(0);
  });

  it("ignores non-letters and empty lists", () => {
    expect(typeaheadIndex(labels, 0, "1")).toBeUndefined();
    expect(typeaheadIndex(labels, 0, "Escape")).toBeUndefined();
    expect(typeaheadIndex([], 0, "a")).toBeUndefined();
  });
});
