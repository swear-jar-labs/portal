import { describe, expect, it } from "vitest";
import { sprites, type SpriteData } from "../sprites";

const SPRITE_SIZE = 16;

const entries: [string, SpriteData][] = Object.entries(sprites);

describe("sprites", () => {
  it("keeps every sprite 16x16 with a complete palette", () => {
    expect(entries.length).toBeGreaterThan(0);

    for (const [name, sprite] of entries) {
      expect(sprite.map, `${name} must have ${SPRITE_SIZE} rows`).toHaveLength(SPRITE_SIZE);

      const colors = new Set(Object.keys(sprite.palette));
      for (const row of sprite.map) {
        expect(row, `${name} rows must be ${SPRITE_SIZE} pixels wide`).toHaveLength(SPRITE_SIZE);
        for (const pixel of row) {
          if (pixel === ".") continue;
          expect(colors.has(pixel), `${name} paints unknown pixel "${pixel}"`).toBe(true);
        }
      }
    }
  });
});
