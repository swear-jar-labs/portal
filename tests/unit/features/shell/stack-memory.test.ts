import { describe, expect, it } from "vitest";
import { createStackMemory } from "@/features/shell/stack-memory";
import { FEED_PATH, threadPath } from "@/features/board/threads";
import { memberPath } from "@/shared/members";

describe("stack memory", () => {
  it("starts as a deep link: no route was pushed, nothing awaits focus", () => {
    const memory = createStackMemory();
    expect(memory.wasPushedFrom(FEED_PATH)).toBe(false);
    expect(memory.takePendingCardFocus()).toBeNull();
  });

  it("matches only the route of the last push", () => {
    const memory = createStackMemory();
    const pushed = threadPath("read-first");
    memory.rememberPush(pushed);
    expect(memory.wasPushedFrom(pushed)).toBe(true);
    expect(memory.wasPushedFrom(threadPath("other"))).toBe(false);
    expect(memory.wasPushedFrom(FEED_PATH)).toBe(false);
  });

  it("keeps the latest route when pushes follow each other", () => {
    const memory = createStackMemory();
    memory.rememberPush(threadPath("first"));
    memory.rememberPush(threadPath("second"));
    expect(memory.wasPushedFrom(threadPath("first"))).toBe(false);
    expect(memory.wasPushedFrom(threadPath("second"))).toBe(true);
  });

  it("hands the pending card focus over exactly once", () => {
    const memory = createStackMemory();
    memory.requestCardFocus("read-first");
    expect(memory.takePendingCardFocus()).toBe("read-first");
    expect(memory.takePendingCardFocus()).toBeNull();
  });

  it("keeps a member push and its focus origin separate from the thread", () => {
    const memory = createStackMemory();
    const thread = threadPath("read-first");
    const member = memberPath("ada");
    memory.rememberPush(thread);
    memory.rememberMemberPush(member, "author-link");

    expect(memory.wasPushedFrom(thread)).toBe(true);
    expect(memory.wasMemberPushedFrom(member)).toBe(true);
    expect(memory.takePendingMemberFocus()).toBe("author-link");
    expect(memory.wasMemberPushedFrom(member)).toBe(false);
    expect(memory.takePendingMemberFocus()).toBeNull();
  });
});
