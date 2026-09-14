import { createElement, type ReactNode } from "react";
import { cx, toneStyle, type Tone } from "../tone";
import styles from "./Heading.module.css";

export type HeadingProps = {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  tone?: Tone;
  id?: string;
  className?: string;
};

export function Heading({ children, level = 2, tone, id, className }: HeadingProps) {
  return createElement(
    `h${level}`,
    {
      id,
      className: cx(styles.heading, styles[`level${level}`], className),
      style: toneStyle(tone),
    },
    children,
  );
}
