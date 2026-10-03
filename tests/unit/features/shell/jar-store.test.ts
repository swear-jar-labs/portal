import { describe, expect, it, vi } from "vitest";
import {
  jarServerSnapshot,
  jarSnapshot,
  recordBadCommand,
  resetJarForTests,
  subscribeJar,
} from "@/features/shell/data/jar-store";

describe("jar store", () => {
  it("records misses oldest-first and notifies subscribers", () => {
    resetJarForTests();
    const listener = vi.fn();
    const release = subscribeJar(listener);
    recordBadCommand("asdf", 10);
    recordBadCommand("qwer", 20);
    expect(jarSnapshot()).toEqual([
      { at: 10, raw: "asdf" },
      { at: 20, raw: "qwer" },
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
    release();
    recordBadCommand("zxcv", 30);
    expect(listener).toHaveBeenCalledTimes(2);
    resetJarForTests();
    expect(jarSnapshot()).toEqual([]);
  });

  it("starts empty on the server", () => {
    resetJarForTests();
    recordBadCommand("asdf", 10);
    expect(jarServerSnapshot()).toEqual([]);
    resetJarForTests();
  });
});
