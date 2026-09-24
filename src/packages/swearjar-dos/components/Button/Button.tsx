"use client";

import type { ButtonHTMLAttributes, CSSProperties, MouseEventHandler, ReactNode } from "react";
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
};

type ButtonLinkProps = ButtonBaseProps & {
  href: string;
  // A link styled as a raised button still downloads (the viewer footer).
  download?: string;
  // An in-app activation hook: the consumer decides when the native
  // navigation is replaced (the shell's routed overlays).
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  type?: never;
  disabled?: never;
};

export type ButtonProps = ButtonControlProps | ButtonLinkProps;

export function Button(props: ButtonProps) {
  const {
    children,
    id,
    href,
    onClick,
    type = "button",
    variant = "default",
    disabled = false,
    ariaLabel,
    className,
    style,
  } = props;
  const classes = cx(styles.button, styles[variant], className);

  if (href !== undefined) {
    // The href check narrows the union to the link variant.
    const { download } = props;
    return (
      <a
        id={id}
        href={href}
        download={download}
        onClick={onClick}
        aria-label={ariaLabel}
        className={classes}
        style={style}
      >
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
      className={classes}
      style={style}
    >
      {children}
    </button>
  );
}
