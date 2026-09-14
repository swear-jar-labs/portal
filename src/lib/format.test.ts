import { describe, expect, it } from "vitest";
import { formatCount, formatSize, formatSummary } from "./format";

describe("formatSize", () => {
  it("keeps bytes below a kilobyte", () => {
    expect(formatSize(512)).toBe("512B");
    expect(formatSize(640)).toBe("640B");
  });

  it("rounds kilobytes", () => {
    expect(formatSize(1024)).toBe("1K");
    expect(formatSize(3072)).toBe("3K");
  });
});

describe("formatCount", () => {
  it("pluralizes", () => {
    expect(formatCount(1, "DIR")).toBe("1 DIR");
    expect(formatCount(3, "DIR")).toBe("3 DIRS");
    expect(formatCount(12, "FILE")).toBe("12 FILES");
  });
});

describe("formatSummary", () => {
  it("joins dirs and files", () => {
    expect(formatSummary(3, 12)).toBe("3 DIRS, 12 FILES");
    expect(formatSummary(1, 1)).toBe("1 DIR, 1 FILE");
  });
});
