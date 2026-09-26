import { describe, expect, it } from "vitest";
import { createStackMemory } from "@/features/shell/stack-memory";
import { FEED_PATH, threadPath } from "@/features/board/model/threads";

describe("stack memory", () => {
  it("starts as a deep link: no route was pushed, nothing awaits focus", () => {
    const memory = createStackMemory();
    expect(memory.takePushedFrom(FEED_PATH)).toBe(false);
    expect(memory.takePendingCardFocus()).toBeNull();
  });

  it("matches only the route of the last push and consumes it", () => {
    const memory = createStackMemory();
    const pushed = threadPath("read-first");
    memory.rememberPush(pushed);
    expect(memory.takePushedFrom(threadPath("other"))).toBe(false);
    expect(memory.takePushedFrom(FEED_PATH)).toBe(false);
    expect(memory.takePushedFrom(pushed)).toBe(true);
    expect(memory.takePushedFrom(pushed)).toBe(false);
  });

  it("keeps the nested pushes as a stack", () => {
    const memory = createStackMemory();
    memory.rememberPush(threadPath("first"));
    memory.rememberPush(threadPath("second"));
    expect(memory.takePushedFrom(threadPath("first"))).toBe(false);
    expect(memory.takePushedFrom(threadPath("second"))).toBe(true);
    // The layer below keeps its own marker for its close.
    expect(memory.takePushedFrom(threadPath("first"))).toBe(true);
  });

  it("records a route once while it stays on top", () => {
    const memory = createStackMemory();
    const thread = threadPath("read-first");
    memory.rememberPush(thread);
    memory.rememberPush(thread);
    expect(memory.takePushedFrom(thread)).toBe(true);
    expect(memory.takePushedFrom(thread)).toBe(false);
  });

  it("hands the pending card focus over exactly once", () => {
    const memory = createStackMemory();
    memory.requestCardFocus("read-first");
    expect(memory.takePendingCardFocus()).toBe("read-first");
    expect(memory.takePendingCardFocus()).toBeNull();
  });
});
