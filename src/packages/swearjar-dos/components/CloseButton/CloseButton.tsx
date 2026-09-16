"use client";

import { cx } from "../tone";
import styles from "./CloseButton.module.css";

export type CloseButtonProps = {
  onClose: () => void;
  label?: string;
  className?: string;
};

// The title-bar [X], shared by Window (dialogs) and Panel chrome (app panels).
export function CloseButton({ onClose, label = "Close", className }: CloseButtonProps) {
  return (
    <button
      type="button"
      className={cx(styles.close, className)}
      onClick={onClose}
      aria-label={label}
    >
      [X]
    </button>
  );
}
