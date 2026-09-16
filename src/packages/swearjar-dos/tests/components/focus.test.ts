import { describe, expect, it } from "vitest";
import { nextControlIndex } from "../../focus";

describe("nextControlIndex", () => {
  it("steps forward and backward", () => {
    expect(nextControlIndex(4, 0, 1)).toBe(1);
    expect(nextControlIndex(4, 2, -1)).toBe(1);
  });

  it("wraps around both edges", () => {
    expect(nextControlIndex(4, 3, 1)).toBe(0);
    expect(nextControlIndex(4, 0, -1)).toBe(3);
  });

  it("enters from the matching edge when focus is outside the list", () => {
    expect(nextControlIndex(4, -1, 1)).toBe(0);
    expect(nextControlIndex(4, -1, -1)).toBe(3);
  });

  it("stays on a single control", () => {
    expect(nextControlIndex(1, 0, 1)).toBe(0);
    expect(nextControlIndex(1, 0, -1)).toBe(0);
  });
});
