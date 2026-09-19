import { describe, expect, it } from "vitest";
import { formatAge, type AgeLabels } from "@/shared/age";

const labels: AgeLabels = {
  now: "JUST NOW",
  ago: "AGO",
  in: "IN",
  minute: "M",
  hour: "H",
  day: "D",
  week: "W",
};

describe("formatAge", () => {
  const now = "2026-09-16T12:00:00.000Z";

  it("reads young ages as now", () => {
    expect(formatAge("2026-09-16T11:59:30.000Z", now, labels)).toBe("JUST NOW");
    expect(formatAge("2026-09-16T12:00:30.000Z", now, labels)).toBe("JUST NOW");
    expect(formatAge("not-a-date", now, labels)).toBe("JUST NOW");
  });

  it("walks the unit boundaries", () => {
    expect(formatAge("2026-09-16T11:59:00.000Z", now, labels)).toBe("1M AGO");
    expect(formatAge("2026-09-16T11:00:00.000Z", now, labels)).toBe("1H AGO");
    expect(formatAge("2026-09-15T12:00:00.000Z", now, labels)).toBe("1D AGO");
    expect(formatAge("2026-09-09T12:00:00.000Z", now, labels)).toBe("1W AGO");
  });

  it("formats minutes, hours, days and weeks into the past", () => {
    expect(formatAge("2026-09-16T11:30:00.000Z", now, labels)).toBe("30M AGO");
    expect(formatAge("2026-09-16T09:00:00.000Z", now, labels)).toBe("3H AGO");
    expect(formatAge("2026-09-13T12:00:00.000Z", now, labels)).toBe("3D AGO");
    expect(formatAge("2026-09-01T12:00:00.000Z", now, labels)).toBe("2W AGO");
  });

  it("labels the future only when the caller has a prefix for it", () => {
    expect(formatAge("2026-09-20T12:00:00.000Z", now, labels)).toBe("IN 4D");

    // The board looks back only: without `in`, a timestamp ahead of the clock
    // (skew) reads as now instead of a false prefix.
    const pastOnly: AgeLabels = {
      now: labels.now,
      ago: labels.ago,
      minute: labels.minute,
      hour: labels.hour,
      day: labels.day,
      week: labels.week,
    };
    expect(formatAge("2026-09-20T12:00:00.000Z", now, pastOnly)).toBe("JUST NOW");
  });
});
