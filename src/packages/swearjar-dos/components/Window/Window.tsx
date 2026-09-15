"use client";

import { type ReactNode } from "react";
import { cx } from "../tone";
import styles from "./Window.module.css";

export type WindowProps = {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "error";
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
};

export function Window({
  title,
  children,
  footer,
  tone = "default",
  onClose,
  closeLabel = "Close",
  className,
}: WindowProps) {
  return (
    <div className={cx(styles.window, tone === "error" && styles.error, className)}>
      <div className={styles.titleBar}>
        <span className={styles.title}>{title}</span>
        {onClose ? (
          <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
            [X]
          </button>
        ) : null}
      </div>
      <div className={styles.body} tabIndex={0}>
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
