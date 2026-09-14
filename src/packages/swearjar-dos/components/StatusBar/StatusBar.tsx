import { type ReactNode } from "react";
import { cx } from "../tone";
import styles from "./StatusBar.module.css";

export type StatusBarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function StatusBar({ left, right, className }: StatusBarProps) {
  return (
    <div className={cx(styles.statusBar, className)}>
      <div className={styles.group}>{left}</div>
      <div className={styles.group}>{right}</div>
    </div>
  );
}
