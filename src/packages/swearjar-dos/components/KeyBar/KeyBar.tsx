"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../tone";
import styles from "./KeyBar.module.css";

export type KeyBarItem = {
  key: string;
  label: string;
  onSelect?: () => void;
};

export type KeyBarProps = {
  items: KeyBarItem[];
  ariaLabel?: string;
  trailing?: ReactNode;
  scrollTrailingIntoView?: boolean;
  className?: string;
};

export function KeyBar({
  items,
  ariaLabel = "Function keys",
  trailing,
  scrollTrailingIntoView = false,
  className,
}: KeyBarProps) {
  const trailingRef = useRef<HTMLDivElement>(null);
  const didScrollTrailing = useRef(false);

  useEffect(() => {
    if (!scrollTrailingIntoView || !trailing || didScrollTrailing.current) return;
    trailingRef.current?.scrollIntoView({ block: "nearest", inline: "end" });
    didScrollTrailing.current = true;
  }, [scrollTrailingIntoView, trailing]);

  return (
    <div className={cx(styles.keyBar, className)} role="toolbar" aria-label={ariaLabel}>
      {items.map((item) => (
        <button key={item.key} type="button" className={styles.key} onClick={item.onSelect}>
          <b className={styles.badge}>{item.key}</b>
          {item.label}
        </button>
      ))}
      {trailing ? (
        <div ref={trailingRef} className={styles.trailing}>
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
