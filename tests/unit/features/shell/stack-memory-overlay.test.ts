import { describe, expect, it } from "vitest";
import { createStackMemory } from "@/features/shell/stack-memory";
import { memberPath } from "@/shared/members";

describe("stack memory overlay pushes", () => {
  it("starts empty: no overlay route, no focus origin", () => {
    const memory = createStackMemory();
    expect(memory.takePendingOverlayFocus()).toBeNull();
  });

  it("keeps a push's focus origin and consumes it once", () => {
    const memory = createStackMemory();
    memory.rememberOverlayPush(memberPath("ada"), "origin-1");
    expect(memory.takePendingOverlayFocus()).toBe("origin-1");
    expect(memory.takePendingOverlayFocus()).toBeNull();
  });

  it("keeps nested overlay pushes as a stack", () => {
    const memory = createStackMemory();
    memory.rememberOverlayPush(memberPath("ada"), "origin-1");
    memory.rememberOverlayPush(memberPath("grace"), "origin-2");
    expect(memory.takePendingOverlayFocus()).toBe("origin-2");
    expect(memory.takePendingOverlayFocus()).toBe("origin-1");
  });

  it("records a route once while it stays on top", () => {
    const memory = createStackMemory();
    memory.rememberOverlayPush(memberPath("ada"), "origin-1");
    memory.rememberOverlayPush(memberPath("ada"), "origin-1");
    expect(memory.takePendingOverlayFocus()).toBe("origin-1");
    expect(memory.takePendingOverlayFocus()).toBeNull();
  });

  it("accepts a null origin for links without a stable id", () => {
    const memory = createStackMemory();
    memory.rememberOverlayPush(memberPath("ada"), null);
    expect(memory.takePendingOverlayFocus()).toBeNull();
  });
});
