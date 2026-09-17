import type { ReactNode } from "react";
import { cx, toneStyle, type Tone } from "../tone";
import styles from "./Tag.module.css";

export type TagProps = {
  children: ReactNode;
  tone?: Tone;
  // A clickable tag is a filter: it becomes a toggle button with a pressed state.
  onClick?: () => void;
  active?: boolean;
  className?: string;
};

export function Tag({ children, tone, onClick, active = false, className }: TagProps) {
  const classes = cx(styles.tag, onClick && styles.button, active && styles.active, className);
  const style = active ? undefined : toneStyle(tone);

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        aria-pressed={active}
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
