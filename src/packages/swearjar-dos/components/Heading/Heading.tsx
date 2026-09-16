import { createElement, type ReactNode } from "react";
import { DOS_ROLE_ATTR } from "../../attributes";
import { cx } from "../tone";
import styles from "./Heading.module.css";

export type HeadingProps = {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  className?: string;
};

export function Heading({ children, level = 2, id, className }: HeadingProps) {
  return createElement(
    `h${level}`,
    {
      id,
      [DOS_ROLE_ATTR]: "heading",
      className: cx(styles.heading, styles[`level${level}`], className),
    },
    children,
  );
}
