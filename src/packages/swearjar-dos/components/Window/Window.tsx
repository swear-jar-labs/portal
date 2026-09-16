"use client";

import { type ReactNode } from "react";
import { DOS_SURFACE_ATTR, DOS_WINDOW_BODY_ATTR } from "../../attributes";
import { cx, type Surface } from "../tone";
import { CloseButton } from "../CloseButton/CloseButton";
import styles from "./Window.module.css";

export type WindowProps = {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "error";
  surface?: Surface;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
};

export function Window({
  title,
  children,
  footer,
  tone = "default",
  surface = "dark",
  onClose,
  closeLabel = "Close",
  className,
}: WindowProps) {
  const surfaceAttrs = surface === "light" ? { [DOS_SURFACE_ATTR]: surface } : undefined;

  return (
    <div className={cx(styles.window, tone === "error" && styles.error, className)}>
      <div className={styles.titleBar}>
        <span className={styles.title}>{title}</span>
        {onClose ? <CloseButton onClose={onClose} label={closeLabel} /> : null}
      </div>
      <div
        className={styles.body}
        tabIndex={0}
        {...{ [DOS_WINDOW_BODY_ATTR]: "" }}
        {...surfaceAttrs}
      >
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
