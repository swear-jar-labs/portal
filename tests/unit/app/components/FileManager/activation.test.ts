import { describe, expect, it } from "vitest";
import { isPlainActivation } from "@/app/components/FileManager/activation";

describe("isPlainActivation", () => {
  it("treats a missing event as a plain activation", () => {
    expect(isPlainActivation()).toBe(true);
  });

  it("accepts an unmodified left click", () => {
    expect(isPlainActivation({ button: 0 })).toBe(true);
    expect(isPlainActivation({ button: 0, ctrlKey: false, metaKey: false })).toBe(true);
  });

  it("rejects modified clicks", () => {
    for (const modifier of ["ctrlKey", "metaKey", "shiftKey", "altKey"] as const) {
      expect(isPlainActivation({ button: 0, [modifier]: true })).toBe(false);
    }
  });

  it("rejects other mouse buttons", () => {
    expect(isPlainActivation({ button: 1 })).toBe(false);
    expect(isPlainActivation({ button: 2 })).toBe(false);
  });
});
