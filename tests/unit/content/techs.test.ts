import { describe, expect, it } from "vitest";
import { isTechId, techIds } from "@/content/techs";

describe("tech vocabulary", () => {
  it("keeps tech ids unique and guarded", () => {
    expect(new Set(techIds).size).toBe(techIds.length);
    expect(isTechId("rust")).toBe(true);
    expect(isTechId("drizzle")).toBe(false);
    expect(isTechId("nope")).toBe(false);
  });
});
