import { describe, expect, it } from "vitest";
import { hasCommandModifier, shouldSkipEvent, type KeyboardGuardEvent } from "../keyboard";

type GuardInput = KeyboardGuardEvent & { shiftKey: boolean };

const event = (overrides: Partial<GuardInput> = {}): GuardInput => ({
  defaultPrevented: false,
  isComposing: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

describe("shouldSkipEvent", () => {
  it("skips a handled or composing event", () => {
    expect(shouldSkipEvent(event({ defaultPrevented: true }))).toBe(true);
    expect(shouldSkipEvent(event({ isComposing: true }))).toBe(true);
  });

  it("leaves a fresh event to the listener", () => {
    expect(shouldSkipEvent(event())).toBe(false);
  });
});

describe("hasCommandModifier", () => {
  it("detects Ctrl, Alt and Meta", () => {
    for (const key of ["ctrlKey", "altKey", "metaKey"] as const) {
      expect(hasCommandModifier(event({ [key]: true }))).toBe(true);
    }
  });

  it("does not count Shift or a plain key as a command modifier", () => {
    expect(hasCommandModifier(event({ shiftKey: true }))).toBe(false);
    expect(hasCommandModifier(event())).toBe(false);
  });
});
