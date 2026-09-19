import { describe, expect, it } from "vitest";
import { defaultDeadlineLocal, fromLocalInput, toLocalInput } from "@/features/readroom/datetime";

const DAY_MS = 86_400_000;

describe("the local datetime bridge", () => {
  it("round-trips an instant through the input value", () => {
    const iso = fromLocalInput("2026-10-01T18:00");
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso ?? "")).toBe("2026-10-01T18:00");
  });

  it("rejects an incomplete or unreadable value", () => {
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("2026-10-01")).toBeNull();
    expect(fromLocalInput("not a date")).toBeNull();
  });

  it("answers an unreadable instant with an empty value", () => {
    expect(toLocalInput("not a date")).toBe("");
  });

  it("defaults a new deadline a week out, to the minute", () => {
    const now = Date.parse("2026-09-19T12:30:00.000Z");
    const iso = fromLocalInput(defaultDeadlineLocal(now));
    expect(iso).not.toBeNull();
    expect(Date.parse(iso ?? "") - now).toBe(7 * DAY_MS);
  });
});
