import { describe, expect, it } from "vitest";
import { techIds, techTagTone } from "@/content/techs";

describe("tech vocabulary", () => {
  it("keeps tech ids unique", () => {
    expect(new Set(techIds).size).toBe(techIds.length);
  });

  it("paints every static tech chip in one tone", () => {
    expect(techTagTone).toBe("muted-magenta");
  });
});
