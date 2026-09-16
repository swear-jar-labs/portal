import { sprites, type SpriteName } from "../../sprites";
import { spritePaths } from "../Sprite/paths";
import styles from "./FileTable.module.css";

export const FILE_ICON_ATTR = "data-file-icon";

// 16px art at 1.5x = 24px: it stays under the row line box (no row growth) and
// on a 2x display lands on an exact 3x grid, so the pixels stay uniform.
const ICON_SCALE = 1.5;

export type FileIconKind = "file" | "dir" | "exe";

// Directories carry their expansion state in the glyph; a row's own sprite (the
// app maps program files to their app icon) wins for files and programs, with
// the document sheet and the gear as kind fallbacks.
function spriteFor(
  kind: FileIconKind,
  expanded: boolean | undefined,
  icon: SpriteName | undefined,
): SpriteName {
  if (kind === "dir") return expanded ? "folderOpen" : "folder";
  if (icon) return icon;
  return kind === "exe" ? "gear" : "file";
}

export type FileIconProps = {
  kind: FileIconKind;
  expanded?: boolean;
  icon?: SpriteName;
};

export function FileIcon({ kind, expanded, icon }: FileIconProps) {
  const name = spriteFor(kind, expanded, icon);
  const { map, palette } = sprites[name];
  const columns = map[0]?.length ?? 0;
  const rows = map.length;

  return (
    <svg
      className={styles.icon}
      viewBox={`0 0 ${columns} ${rows}`}
      width={columns * ICON_SCALE}
      height={rows * ICON_SCALE}
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...{ [FILE_ICON_ATTR]: name }}
    >
      {spritePaths({ map, palette }).map((path) => (
        <path
          key={path.outline ? "outline" : path.fill}
          className={path.outline ? styles.outline : undefined}
          fill={path.outline ? undefined : path.fill}
          d={path.d}
        />
      ))}
    </svg>
  );
}
