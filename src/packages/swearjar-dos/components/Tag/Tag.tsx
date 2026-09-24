import type { CSSProperties, ReactNode } from "react";
import { cx, toneBlockColor, toneColor, type Tone } from "../tone";
import styles from "./Tag.module.css";

export type TagProps = {
  children: ReactNode;
  tone?: Tone;
  // A clickable tag is a filter: it becomes a toggle button with a pressed state.
  onClick?: () => void;
  active?: boolean;
  // A button whose visible text does not say what the press does (a "remove
  // me" chip): the accessible name then comes from here, e.g. "Remove Rust".
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function Tag({
  children,
  tone,
  onClick,
  active = false,
  ariaLabel,
  disabled = false,
  className,
}: TagProps) {
  const classes = cx(styles.tag, onClick && styles.button, active && styles.active, className);
  // The tone travels as custom properties, not as an inline color: the surface
  // owns how a chip spends it — ink by default, fill (the raw CGA block) on the
  // light surfaces (the cast only adds the custom properties to CSSProperties).
  const style =
    active || !tone
      ? undefined
      : ({
          "--dos-tag-tone": toneColor[tone],
          "--dos-tag-fill": toneBlockColor[tone],
        } as CSSProperties);

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        aria-pressed={active}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}
