import { cx } from "../tone";
import { sprites, type SpriteData, type SpriteName } from "../../sprites";
import styles from "./Sprite.module.css";

export type SpriteProps = {
  name?: SpriteName;
  map?: readonly string[];
  palette?: Readonly<Record<string, string>>;
  cell?: number;
  label?: string;
  decorative?: boolean;
  className?: string;
};

export function Sprite({
  name = "jar",
  map,
  palette,
  cell = 4,
  label,
  decorative = false,
  className,
}: SpriteProps) {
  const data: SpriteData = map && palette ? { map, palette } : sprites[name];
  const columns = data.map[0]?.length ?? 0;

  return (
    <span
      className={cx(styles.sprite, className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
      }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (label ?? name)}
      aria-hidden={decorative ? true : undefined}
    >
      {data.map.flatMap((row, rowIndex) =>
        row
          .split("")
          .map((pixel, columnIndex) => (
            <i
              key={`${rowIndex}-${columnIndex}`}
              className={styles.pixel}
              style={{ background: data.palette[pixel] }}
            />
          )),
      )}
    </span>
  );
}
