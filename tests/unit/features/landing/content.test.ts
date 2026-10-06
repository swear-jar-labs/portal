import { describe, expect, it } from "vitest";
import { landing, type LandingPlaceEntry } from "@/content/landing";
import { messages } from "@/content/messages";

describe("landing content", () => {
  it("carries the hero copy: slogan lines, hook and lead", () => {
    expect(landing.slogan).toHaveLength(3);
    for (const line of landing.slogan) expect(line.length).toBeGreaterThan(0);
    expect(landing.hook.length).toBeGreaterThan(0);
    expect(landing.lead).toHaveLength(2);
  });

  it("pins the four box places with unique ids", () => {
    const entries: readonly LandingPlaceEntry[] = landing.places.entries;
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(4);
    for (const entry of entries) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.first.length).toBeGreaterThan(0);
      expect(entry.second.length).toBeGreaterThan(0);
      expect(entry.alt.length).toBeGreaterThan(0);
    }
  });

  it("reuses the central product version instead of its own", () => {
    expect(messages.shell.brand.version).toMatch(/^v\d+\.\d+$/);
  });

  it("keeps a reachable footer contact", () => {
    expect(landing.footer.email).toContain("@");
  });
});
