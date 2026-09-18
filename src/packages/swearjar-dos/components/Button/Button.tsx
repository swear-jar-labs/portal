"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cx } from "../tone";
import styles from "./Button.module.css";

export type ButtonProps = {
  children: ReactNode;
  // A known anchor: focus returns to the control that opened a layer.
  id?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  type?: "button" | "submit" | "reset";
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

export function Button({
  children,
  id,
  onClick,
  type = "button",
  variant = "default",
  disabled = false,
  ariaLabel,
  className,
  style,
}: ButtonProps) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx(styles.button, styles[variant], className)}
      style={style}
    >
      {children}
    </button>
  );
}
