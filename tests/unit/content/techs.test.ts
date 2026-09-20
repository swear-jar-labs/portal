import { describe, expect, it } from "vitest";
import { techIds } from "@/content/techs";

describe("tech vocabulary", () => {
  it("keeps tech ids unique", () => {
    expect(new Set(techIds).size).toBe(techIds.length);
  });
});
