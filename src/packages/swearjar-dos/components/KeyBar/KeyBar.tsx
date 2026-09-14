"use client";

import { cx } from "../tone";
import styles from "./KeyBar.module.css";

export type KeyBarItem = {
  key: string;
  label: string;
  onSelect?: () => void;
};

export type KeyBarProps = {
  items: KeyBarItem[];
  className?: string;
};

export function KeyBar({ items, className }: KeyBarProps) {
  return (
    <div className={cx(styles.keyBar, className)} role="toolbar" aria-label="Function keys">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={styles.key}
          onClick={item.onSelect}
        >
          <b className={styles.badge}>{item.key}</b>
          {item.label}
        </button>
      ))}
    </div>
  );
}
