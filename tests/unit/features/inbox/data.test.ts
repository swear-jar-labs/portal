import { describe, expect, it } from "vitest";
import { listInboxSeed } from "@/features/inbox/data";

describe("inbox seeds", () => {
  it("gives ada a full box with one unavailable target", async () => {
    const seed = await listInboxSeed("ada");
    expect(seed.length).toBeGreaterThan(3);
    const kinds = new Set(seed.map((entry) => entry.kind));
    expect(kinds.has("review")).toBe(true);
    expect(kinds.has("ticket")).toBe(true);
    expect(kinds.has("readroom")).toBe(true);
    const dead = seed.filter((entry) => !entry.available);
    expect(dead).toHaveLength(1);
    expect(dead[0]?.unavailableReason).toBeTruthy();
  });

  it("alerts admin about the lost maintainer first", async () => {
    const seed = await listInboxSeed("admin");
    expect(seed[0]?.kind).toBe("project");
    expect(seed[0]?.target.href).toBe("/admin");
  });

  it("falls back to the participant box for unknown handles", async () => {
    const seed = await listInboxSeed("fresh-participant");
    expect(seed.length).toBeGreaterThan(0);
    expect(seed.some((entry) => !entry.read)).toBe(true);
  });
});
