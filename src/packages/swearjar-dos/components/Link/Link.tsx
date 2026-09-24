import { type MouseEvent, type ReactNode } from "react";
import { cx, toneStyle, type Tone } from "../tone";
import styles from "./Link.module.css";

export type LinkProps = {
  children: ReactNode;
  href: string;
  tone?: Tone;
  external?: boolean;
  underline?: boolean;
  // A download target (a same-origin blob): the browser saves the file instead
  // of navigating away from the shell.
  download?: string;
  className?: string;
  id?: string;
  // An in-app activation hook: the consumer decides when the native
  // navigation is replaced (the shell's routed overlays).
  onClick?: (event?: MouseEvent<HTMLElement>) => void;
};

export function Link({
  children,
  href,
  tone,
  external = false,
  underline = false,
  download,
  className,
  id,
  onClick,
}: LinkProps) {
  const externalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <a
      id={id}
      href={href}
      className={cx(styles.link, underline && styles.underline, className)}
      style={toneStyle(tone)}
      onClick={onClick}
      {...externalProps}
      {...(download === undefined ? {} : { download })}
    >
      {children}
    </a>
  );
}
