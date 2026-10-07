// Pixel-art scene for the landing hero (approved redraw) and the floppy disk
// next to the "3 x floppy disks" caption. Grids are 1px cells holding --dos-*
// hexes; PixelScene paints them 1:1 with smoothing off.
//
// The desk scene stays a builder (64x40 is unwieldy as hand ASCII art); the
// floppy is a plain matrix like the kit sprites, so pixel edits read off the
// page. The jar on the desk reuses the kit sprite map, so the mascot stays a
// single source.
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

// Concrete hexes mirroring the kit tokens (see tokens.css); the desk trio is
// scene-specific (the kit has no wood token).
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
  red: "#ff5555",
  dim: "#333333",
  deskLight: "#c17030",
  deskDeep: "#482400",
  deskContact: "#2a1400",
} as const;

// A black wall with a few stars.
function drawSky(grid: GridBuilder) {
  const stars: ReadonlyArray<readonly [number, number]> = [
    [2, 6],
    [13, 3],
    [27, 19],
    [49, 3],
    [59, 16],
    [8, 23],
    [34, 13],
    [61, 6],
  ];
  for (const [x, y] of stars) rect(grid, x, y, 1, 1, INK.dim);
}

function drawDesk(grid: GridBuilder) {
  rect(grid, 0, 33, 64, 1, INK.deskLight);
  rect(grid, 0, 34, 64, 2, INK.brown);
  for (const x of [6, 19, 31, 44, 57]) rect(grid, x, 34, 1, 2, INK.darkBrown);
  rect(grid, 0, 36, 64, 1, INK.darkBrown);
  rect(grid, 0, 37, 64, 3, INK.deskDeep);
  for (const x of [9, 22, 35, 48, 61]) rect(grid, x, 38, 1, 1, INK.darkBrown);
}

// The desk top row darkens under a standing object, so nothing floats.
function contactShadow(grid: GridBuilder, x1: number, x2: number) {
  rect(grid, x1, 33, x2 - x1 + 1, 1, INK.deskContact);
}

// The CRT: shell x5..34 y1..24, stand y25..29. The bezel is flat (no bevel);
// the vents, the brand plate, the power led and the code lines carry the read.
function drawMonitor(grid: GridBuilder) {
  rect(grid, 5, 1, 30, 24, INK.black);
  rect(grid, 6, 2, 28, 22, INK.silver);
  for (const x of [28, 30, 32]) rect(grid, x, 2, 1, 1, INK.dim);
  rect(grid, 8, 4, 24, 16, INK.gray);
  rect(grid, 9, 5, 22, 14, INK.black);
  rect(grid, 10, 6, 20, 1, INK.lightGray); // menu bar
  for (const x of [11, 14, 17, 21, 24, 27]) rect(grid, x, 6, 1, 1, INK.dim);
  const code: ReadonlyArray<readonly [number, number, number, string]> = [
    [8, 11, 12, INK.green],
    [9, 13, 6, INK.cyan],
    [10, 11, 10, INK.green],
    [11, 13, 5, INK.yellow],
    [12, 11, 13, INK.green],
    [13, 10, 6, INK.white],
    [14, 12, 9, INK.cyan],
    [15, 11, 11, INK.green],
    [16, 13, 8, INK.red], // the line that went wrong
  ];
  for (const [row, x, width, color] of code) rect(grid, x, row, width, 1, color);
  rect(grid, 24, 12, 2, 1, INK.white); // block cursor
  rect(grid, 9, 22, 7, 1, INK.dim); // brand plate
  rect(grid, 31, 22, 1, 1, INK.green); // power led
  rect(grid, 17, 25, 5, 2, INK.gray);
  rect(grid, 18, 25, 3, 1, INK.lightGray);
  rect(grid, 13, 27, 13, 3, INK.black);
  rect(grid, 14, 28, 11, 2, INK.lightGray);
  rect(grid, 14, 29, 11, 1, INK.gray);
}

// Keyboard x8..31 y29..32: a dark back edge, two key rows with gaps, the front
// lip and the space bar.
function drawKeyboard(grid: GridBuilder) {
  rect(grid, 8, 29, 24, 4, INK.black);
  rect(grid, 9, 29, 22, 1, INK.dim);
  rect(grid, 9, 30, 22, 1, INK.lightGray);
  for (let x = 10; x <= 29; x += 2) rect(grid, x, 30, 1, 1, INK.dim);
  rect(grid, 9, 31, 22, 1, INK.lightGray);
  for (let x = 9; x <= 29; x += 2) rect(grid, x, 31, 1, 1, INK.dim);
  rect(grid, 9, 32, 22, 1, INK.gray);
  rect(grid, 16, 32, 9, 1, INK.lightGray);
}

// The low-profile mouse x32..38 y31..32, right of the keyboard.
function drawMouse(grid: GridBuilder) {
  rect(grid, 32, 31, 7, 2, INK.black);
  rect(grid, 33, 31, 5, 1, INK.silver);
  rect(grid, 35, 31, 1, 1, INK.black); // button split
  rect(grid, 33, 32, 5, 1, INK.gray);
}

// The coffee mug x0..3 (plus the handle); its base sits on the desk top row.
function drawMug(grid: GridBuilder) {
  rect(grid, 0, 27, 4, 1, INK.black);
  rect(grid, 0, 28, 4, 1, INK.silver);
  rect(grid, 1, 28, 2, 1, INK.dim); // coffee
  rect(grid, 0, 29, 4, 3, INK.silver);
  rect(grid, 3, 29, 1, 3, INK.gray);
  rect(grid, 0, 32, 4, 1, INK.gray);
  rect(grid, 0, 33, 4, 1, INK.black);
  rect(grid, 4, 29, 1, 1, INK.silver);
  rect(grid, 5, 30, 1, 1, INK.silver);
  rect(grid, 4, 31, 1, 1, INK.silver);
  rect(grid, 1, 25, 1, 1, INK.gray); // steam
  rect(grid, 2, 24, 1, 1, INK.gray);
}

// The rubber duck (the debugging companion) on the desk, facing the jar.
const DUCK_PALETTE = { K: INK.black, y: INK.yellow, o: INK.brown } as const;

const DUCK_MAP = [
  "...KK...",
  "..KyyK..",
  "ooyKyK..",
  ".KyyyK..",
  ".KyyyyK.",
  ".KyyyyyK",
  ".KyyyyyK",
  ".KKKKKKK",
] as const;

// The hero desk at night: the CRT with code, the mascot jar, the keyboard and
// the low mouse, the mug and the duck. The jar is the kit sprite, so the
// mascot stays a single source.
function buildHero(): PixelGrid {
  const grid = blank(64, 40);
  drawSky(grid);
  drawMonitor(grid);
  drawDesk(grid);
  contactShadow(grid, 40, 51); // jar
  contactShadow(grid, 53, 62); // duck
  contactShadow(grid, 7, 39); // keyboard + mouse
  stamp(grid, sprites.jar.map, sprites.jar.palette, 38, 20);
  stamp(grid, DUCK_MAP, DUCK_PALETTE, 54, 25);
  drawKeyboard(grid);
  drawMouse(grid);
  drawMug(grid);
  return grid.cells;
}

// The floppy disk: a square diskette with a sliding shutter on a flat body.
// Edges are dark gray, not black — a black outline would dissolve into the
// black hero.
const FLOPPY_PALETTE = {
  g: "#555555",
  l: "#AAAAAA",
  W: "#FFFFFF",
  s: "#C0C0C0",
  r: "#FF5555",
  K: "#000000",
} as const;

const FLOPPY_MAP = [
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
      if (color === undefined) throw new Error(`landing floppy paints unknown pixel "${pixel}"`);
      return color;
    }),
  );
}

export const SCENE_GRIDS = {
  hero: buildHero(),
  floppyDisk: gridFromMap(FLOPPY_MAP, FLOPPY_PALETTE),
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
