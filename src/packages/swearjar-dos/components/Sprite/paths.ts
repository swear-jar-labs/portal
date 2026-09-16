import type { SpriteData } from "../../sprites";

export type SpritePath = {
  fill: string;
  outline?: boolean;
  d: string;
};

// Sprite black on the silhouette edge is the outline: it renders through the
// surface-aware color (the --dos-icon-outline variable) so the glyph reads on
// the blue panel. Black inside the shape stays literal — bubble dots, lid
// lines, perforation dashes.
const OUTLINE_KEY = "K";

type PathGroup = {
  fill: string;
  outline: boolean;
  runs: string[];
};

export function spritePaths(data: SpriteData): SpritePath[] {
  const { map, palette } = data;

  const fillAt = (x: number, y: number): string | undefined => {
    const pixel = map[y]?.[x];
    return pixel === undefined ? undefined : palette[pixel];
  };

  const groupAt = (x: number, y: number): PathGroup | undefined => {
    const pixel = map[y]?.[x];
    if (pixel === undefined) return undefined;
    const fill = palette[pixel];
    if (!fill) return undefined;
    const onEdge =
      fillAt(x - 1, y) === undefined ||
      fillAt(x + 1, y) === undefined ||
      fillAt(x, y - 1) === undefined ||
      fillAt(x, y + 1) === undefined;
    return { fill, outline: pixel === OUTLINE_KEY && onEdge, runs: [] };
  };

  const groups = new Map<string, PathGroup>();
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const group = groupAt(x, y);
      const start = x;
      while (x < row.length && sameGroup(group, groupAt(x, y))) x += 1;
      if (!group) continue;
      const key = group.outline ? "outline" : group.fill;
      const stored = groups.get(key) ?? { ...group, runs: [] };
      stored.runs.push(`M${start} ${y}h${x - start}v1H${start}z`);
      groups.set(key, stored);
    }
  });

  return [...groups.values()].map(({ fill, outline, runs }) => ({
    fill,
    outline,
    d: runs.join(""),
  }));
}

function sameGroup(a: PathGroup | undefined, b: PathGroup | undefined): boolean {
  if (!a || !b) return a === b;
  return a.fill === b.fill && a.outline === b.outline;
}
