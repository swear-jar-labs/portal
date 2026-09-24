import { describe, expect, it } from "vitest";
import { createOverlayStore, type OverlayPanel } from "@/features/shell/overlay-store";

const panel = (title: string): OverlayPanel => ({ title, body: null });

describe("overlay store", () => {
  it("starts empty", () => {
    const store = createOverlayStore();
    expect(store.layers()).toEqual([]);
    expect(store.hosts()).toBe(0);
  });

  it("pushes a new key on top", () => {
    const store = createOverlayStore();
    store.register("/projects/tooling", [panel("Tooling")]);
    store.register("/members/ada", [panel("Members")]);
    expect(store.layers().map((entry) => entry.key)).toEqual(["/projects/tooling", "/members/ada"]);
  });

  it("upserts the same pathname without a second layer (query-only navigation)", () => {
    const store = createOverlayStore();
    store.register("/projects/tooling", [panel("Tooling")]);
    store.register("/projects/tooling", [panel("Tooling"), panel("Manage team")]);
    const layers = store.layers();
    expect(layers).toHaveLength(1);
    expect(layers[0]?.panels.map((entry) => entry.title)).toEqual(["Tooling", "Manage team"]);
  });

  it("truncates everything above a revisited key (browser back)", () => {
    const store = createOverlayStore();
    store.register("/projects/tooling", [panel("Tooling")]);
    store.register("/members/ada", [panel("Ada")]);
    store.register("/projects/tooling", [panel("Tooling")]);
    expect(store.layers().map((entry) => entry.key)).toEqual(["/projects/tooling"]);
  });

  it("clears the chain on routes without an interceptor", () => {
    const store = createOverlayStore();
    store.register("/members/ada", [panel("Ada")]);
    store.clear();
    expect(store.layers()).toEqual([]);
  });

  it("keeps the parent on unregister (no-op by design)", () => {
    const store = createOverlayStore();
    store.register("/projects/tooling", [panel("Tooling")]);
    store.register("/members/ada", [panel("Ada")]);
    // The unmounting member outlet's cleanup runs before anything else: it
    // must not delete entries, or the project below vanishes on every push.
    store.unregister();
    expect(store.layers().map((entry) => entry.key)).toEqual(["/projects/tooling", "/members/ada"]);
  });

  it("counts host claims and releases them once", () => {
    const store = createOverlayStore();
    const releaseFirst = store.claimHost();
    const releaseSecond = store.claimHost();
    expect(store.hosts()).toBe(2);
    releaseFirst();
    expect(store.hosts()).toBe(1);
    releaseFirst();
    expect(store.hosts()).toBe(1);
    releaseSecond();
    expect(store.hosts()).toBe(0);
  });

  it("notifies subscribers on register and clear", () => {
    const store = createOverlayStore();
    let calls = 0;
    const stop = store.subscribe(() => {
      calls += 1;
    });
    store.register("/members/ada", [panel("Ada")]);
    store.clear();
    store.clear();
    stop();
    store.register("/members/ada", [panel("Ada")]);
    expect(calls).toBe(2);
  });
});
