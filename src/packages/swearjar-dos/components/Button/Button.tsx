"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cx } from "../tone";
import styles from "./Button.module.css";

type ButtonBaseProps = {
  children: ReactNode;
  // A known anchor: focus returns to the control that opened a layer.
  id?: string;
  variant?: "default" | "primary" | "danger" | "ghost";
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

type ButtonControlProps = ButtonBaseProps & {
  href?: never;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  // A toggle button (the editor's write/preview tabs) exposes its state.
  ariaPressed?: boolean;
};

type ButtonLinkProps = ButtonBaseProps & {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
  ariaPressed?: never;
};

export type ButtonProps = ButtonControlProps | ButtonLinkProps;

export function Button({
  children,
  id,
  href,
  onClick,
  type = "button",
  variant = "default",
  disabled = false,
  ariaLabel,
  ariaPressed,
  className,
  style,
}: ButtonProps) {
  const classes = cx(styles.button, styles[variant], className);

  if (href !== undefined) {
    return (
      <a id={id} href={href} aria-label={ariaLabel} className={classes} style={style}>
        {children}
      </a>
    );
  }

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={classes}
      style={style}
    >
      {children}
    </button>
  );
}
