import { describe, expect, it } from "vitest";
import { BOOT_DONE_PADDING_MS, buildBootSchedule } from "@/app/components/DosShell/boot";

describe("buildBootSchedule", () => {
  it("reveals one line per step, starting at the first step delay", () => {
    const { steps } = buildBootSchedule(6);
    expect(steps).toHaveLength(7);
    expect(steps.map((step) => step.revealed)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(steps[0]?.at).toBe(250);
  });

  it("takes a long pause only after the third and sixth lines", () => {
    const { steps } = buildBootSchedule(6);
    const gaps = steps.slice(1).map((step, index) => step.at - (steps[index]?.at ?? 0));
    expect(gaps).toEqual([250, 250, 500, 250, 250, 500]);
  });

  it("finishes after the last step plus the done padding", () => {
    const { steps, doneAt } = buildBootSchedule(6);
    const last = steps.at(-1);
    expect(doneAt).toBe((last?.at ?? 0) + 250 + BOOT_DONE_PADDING_MS);
  });
});
