// Pixel-art placeholders for the landing hero. The AI-generated first wave
// replaces them; composition and slots are final. Grids are 1px cells holding
// --dos-* hexes; PixelScene paints them 1:1 with smoothing off.
//
// The desk scene stays a builder (64x40 is unwieldy as hand ASCII art); the
// software box is a plain matrix like the kit sprites, so pixel edits read
// off the page. The jar on the desk reuses the kit sprite map, so the mascot
// stays a single source.
import { sprites } from "@swearjar/dos";

export type PixelGrid = (string | null)[][];

type GridBuilder = {
  width: number;
  height: number;
  cells: (string | null)[][];
};

function blank(width: number, height: number): GridBuilder {
  return {
    width,
    height,
    cells: Array.from({ length: height }, () => Array<string | null>(width).fill(null)),
  };
}

function rect(
  grid: GridBuilder,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const line = grid.cells[row];
      if (line !== undefined && column >= 0 && column < grid.width) line[column] = color;
    }
  }
}

function stamp(
  grid: GridBuilder,
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  atX: number,
  atY: number,
) {
  rows.forEach((row, rowIndex) => {
    row.split("").forEach((pixel, columnIndex) => {
      const color = palette[pixel];
      if (color === undefined) return;
      const line = grid.cells[atY + rowIndex];
      if (line !== undefined && atX + columnIndex >= 0 && atX + columnIndex < grid.width) {
        line[atX + columnIndex] = color;
      }
    });
  });
}

// Concrete hexes mirroring the kit tokens (see tokens.css).
const INK = {
  black: "#000000",
  silver: "#c0c0c0",
  gray: "#555555",
  lightGray: "#aaaaaa",
  brown: "#aa5500",
  darkBrown: "#7a3c00",
  yellow: "#ffff55",
  white: "#ffffff",
  green: "#55ff55",
  cyan: "#55ffff",
  lightBlue: "#5555ff",
  dim: "#333333",
} as const;

// A desk scene: CRT with code, the jar beside it, diskettes on the right.
function buildHero(): PixelGrid {
  const grid = blank(64, 40);
  const stars: ReadonlyArray<readonly [number, number]> = [
    [3, 2],
    [12, 4],
    [24, 2],
    [37, 3],
    [51, 2],
    [60, 5],
    [7, 9],
    [58, 12],
    [2, 17],
    [45, 6],
    [30, 5],
    [19, 8],
    [62, 20],
    [5, 24],
    [33, 16],
  ];
  for (const [x, y] of stars) rect(grid, x, y, 1, 1, INK.dim);

  // Desk.
  rect(grid, 0, 33, 64, 1, INK.brown);
  rect(grid, 0, 34, 64, 2, INK.brown);
  rect(grid, 0, 36, 64, 4, INK.darkBrown);

  // CRT monitor.
  rect(grid, 5, 4, 29, 23, INK.black);
  rect(grid, 6, 5, 27, 21, INK.silver);
  rect(grid, 8, 7, 23, 17, INK.gray);
  rect(grid, 9, 8, 21, 15, INK.black);
  const code: ReadonlyArray<readonly [number, number, number, string]> = [
    [9, 10, 12, INK.green],
    [10, 14, 5, INK.cyan],
    [11, 10, 9, INK.green],
    [12, 12, 4, INK.yellow],
    [13, 10, 11, INK.green],
    [14, 16, 6, INK.white],
    [15, 10, 8, INK.green],
    [16, 18, 3, INK.gray],
    [17, 12, 10, INK.green],
    [18, 10, 5, INK.yellow],
    [19, 14, 7, INK.green],
    [20, 10, 4, INK.cyan],
    [21, 12, 8, INK.green],
    [22, 10, 6, INK.gray],
  ];
  for (const [row, x, width, color] of code) rect(grid, x, row, width, 1, color);
  rect(grid, 14, 21, 2, 1, INK.white);
  rect(grid, 31, 24, 1, 1, INK.green);
  rect(grid, 16, 27, 7, 2, INK.gray);
  rect(grid, 12, 29, 15, 4, INK.silver);

  // The jar on the desk (the kit sprite, single-sourced).
  stamp(grid, sprites.jar.map, sprites.jar.palette, 38, 20);

  // 3.5" diskettes on the right.
  rect(grid, 55, 24, 8, 9, INK.black);
  rect(grid, 56, 25, 6, 7, INK.lightGray);
  rect(grid, 57, 26, 4, 3, INK.lightBlue);
  rect(grid, 56, 24, 6, 1, INK.gray);
  rect(grid, 55, 33, 8, 1, INK.black);

  return grid.cells;
}

// The software box: a square diskette with a sliding shutter on a flat box.
// Edges are dark gray, not black — a black outline would dissolve into the
// black hero.
const BOX_PALETTE = {
  g: "#555555",
  l: "#AAAAAA",
  W: "#FFFFFF",
  s: "#C0C0C0",
  r: "#FF5555",
  K: "#000000",
} as const;

const BOX_MAP = [
  "................",
  "..gggggggggg....",
  "..gsssssssssg...",
  "..grrrrrrrrrrg..",
  "..grrrrrrrrrrg..",
  "..gssssssssssg..",
  "..gWWWWWWWWWWg..",
  "..gWKKKKKKKKWg..",
  "..gWWWWWWWWWWg..",
  "..gssssssssssg..",
  "..gggggggggggg..",
  "................",
] as const;

function gridFromMap(map: readonly string[], palette: Readonly<Record<string, string>>): PixelGrid {
  return map.map((row) =>
    row.split("").map((pixel) => {
      if (pixel === ".") return null;
      const color = palette[pixel];
      if (color === undefined) throw new Error(`landing box paints unknown pixel "${pixel}"`);
      return color;
    }),
  );
}

export const SCENE_GRIDS = {
  hero: buildHero(),
  box: gridFromMap(BOX_MAP, BOX_PALETTE),
} as const satisfies Record<string, PixelGrid>;

export type PixelSceneName = keyof typeof SCENE_GRIDS;

export function paintPixelGrid(canvas: HTMLCanvasElement, grid: PixelGrid): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (width === 0 || height === 0) return;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.fillStyle = INK.black;
  context.fillRect(0, 0, width, height);
  grid.forEach((line, y) => {
    line.forEach((color, x) => {
      if (color === null) return;
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    });
  });
}
