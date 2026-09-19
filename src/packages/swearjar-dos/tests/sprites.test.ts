import { describe, expect, it } from "vitest";
import { sprites, type SpriteData } from "../sprites";

const SPRITE_SIZES = [16, 20];

const entries: [string, SpriteData][] = Object.entries(sprites);

describe("sprites", () => {
  it("keeps every sprite square with a complete palette", () => {
    expect(entries.length).toBeGreaterThan(0);

    for (const [name, sprite] of entries) {
      const size = sprite.map.length;
      expect(SPRITE_SIZES, `${name} must be 16 or 20 pixels`).toContain(size);

      const colors = new Set(Object.keys(sprite.palette));
      for (const row of sprite.map) {
        expect(row, `${name} rows must be ${size} pixels wide`).toHaveLength(size);
        for (const pixel of row) {
          if (pixel === ".") continue;
          expect(colors.has(pixel), `${name} paints unknown pixel "${pixel}"`).toBe(true);
        }
      }
    }
  });
});
