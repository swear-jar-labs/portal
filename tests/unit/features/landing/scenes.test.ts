import { describe, expect, it } from "vitest";
import { SCENE_GRIDS } from "@/features/landing/scenes";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

describe("landing pixel scenes", () => {
  it("keeps the hero scene at 64x40 and the box 16 wide", () => {
    expect(SCENE_GRIDS.hero).toHaveLength(40);
    expect(SCENE_GRIDS.hero[0]).toHaveLength(64);
    expect(SCENE_GRIDS.box[0]).toHaveLength(16);
    for (const grid of Object.values(SCENE_GRIDS)) {
      const width = grid[0]?.length ?? 0;
      expect(width).toBeGreaterThan(0);
      for (const line of grid) expect(line).toHaveLength(width);
    }
  });

  it("paints every cell with a palette hex or leaves it empty", () => {
    for (const grid of Object.values(SCENE_GRIDS)) {
      for (const line of grid) {
        for (const cell of line) {
          if (cell !== null) expect(cell).toMatch(HEX_COLOR);
        }
      }
    }
  });

  it("draws something on both scenes", () => {
    for (const grid of Object.values(SCENE_GRIDS)) {
      const painted = grid.flat().filter((cell) => cell !== null);
      expect(painted.length).toBeGreaterThan(100);
    }
  });
});
