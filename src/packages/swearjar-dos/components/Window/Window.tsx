"use client";

import { type ReactNode } from "react";
import { DOS_WINDOW_BODY_ATTR } from "../../attributes";
import { cx } from "../tone";
import { CloseButton } from "../CloseButton/CloseButton";
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
        {onClose ? <CloseButton onClose={onClose} label={closeLabel} /> : null}
      </div>
      <div className={styles.body} tabIndex={0} {...{ [DOS_WINDOW_BODY_ATTR]: "" }}>
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
