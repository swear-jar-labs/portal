import { type ReactNode } from "react";
import { cx, toneStyle, type Tone } from "../tone";
import styles from "./Link.module.css";

export type LinkProps = {
  children: ReactNode;
  href: string;
  tone?: Tone;
  external?: boolean;
  underline?: boolean;
  className?: string;
  id?: string;
};

export function Link({
  children,
  href,
  tone,
  external = false,
  underline = false,
  className,
  id,
}: LinkProps) {
  const externalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <a
      id={id}
      href={href}
      className={cx(styles.link, underline && styles.underline, className)}
      style={toneStyle(tone)}
      {...externalProps}
    >
      {children}
    </a>
  );
}
