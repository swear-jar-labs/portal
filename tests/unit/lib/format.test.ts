import { describe, expect, it } from "vitest";
import { pluralForms } from "@/content/messages";
import { formatCount, formatSize, formatSummary, formatTimestamp } from "@/lib/format";

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
  it("picks the form for the count", () => {
    expect(formatCount(1, pluralForms.coin)).toBe("1 COIN");
    expect(formatCount(3, pluralForms.coin)).toBe("3 COINS");
  });
});

describe("formatSummary", () => {
  it("joins dirs and files", () => {
    expect(formatSummary(3, 12, pluralForms)).toBe("3 DIRS, 12 FILES");
    expect(formatSummary(1, 1, pluralForms)).toBe("1 DIR, 1 FILE");
  });
});

describe("formatTimestamp", () => {
  it("stamps an ISO instant as a compact UTC line", () => {
    expect(formatTimestamp("2026-09-20T11:00:00.000Z")).toBe("2026-09-20 11:00 UTC");
  });
});
