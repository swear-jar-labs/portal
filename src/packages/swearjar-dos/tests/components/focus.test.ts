import { describe, expect, it } from "vitest";
import { nextControlIndex, nextStepIndex } from "../../focus";

const visibleAt =
  (...indexes: number[]) =>
  (index: number) =>
    indexes.includes(index);

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

describe("nextStepIndex", () => {
  it("keeps the plain step while the current row is in sight", () => {
    expect(nextStepIndex(4, 1, 1, () => true)).toBe(2);
    expect(nextStepIndex(4, 1, -1, () => true)).toBe(0);
  });

  it("keeps the wrap-around from a row in sight", () => {
    expect(nextStepIndex(4, 3, 1, () => true)).toBe(0);
    expect(nextStepIndex(4, 0, -1, () => true)).toBe(3);
  });

  it("enters the visible edge when there is no current row", () => {
    expect(nextStepIndex(4, -1, 1, visibleAt(2))).toBe(2);
    expect(nextStepIndex(4, -1, -1, visibleAt(1))).toBe(1);
  });

  it("enters the visible edge when the current row is out of sight", () => {
    expect(nextStepIndex(4, 0, 1, visibleAt(1, 2))).toBe(1);
    expect(nextStepIndex(4, 0, -1, visibleAt(1, 2))).toBe(2);
    expect(nextStepIndex(4, 3, -1, visibleAt(1, 2))).toBe(2);
  });

  it("falls back to the list edge when nothing is visible", () => {
    expect(nextStepIndex(4, 0, 1, () => false)).toBe(1);
    expect(nextStepIndex(4, -1, -1, () => false)).toBe(3);
  });
});
