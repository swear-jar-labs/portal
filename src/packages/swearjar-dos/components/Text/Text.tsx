import { createElement, type ReactNode } from "react";
import { cx, toneStyle, type Tone } from "../tone";
import styles from "./Text.module.css";

export type TextProps = {
  children: ReactNode;
  as?: "p" | "span" | "div" | "strong" | "em" | "small";
  tone?: Tone;
  weight?: "normal" | "bold";
  align?: "left" | "center" | "right";
  className?: string;
};

export function Text({ children, as = "p", tone, weight, align, className }: TextProps) {
  return createElement(
    as,
    {
      className: cx(
        styles.text,
        weight === "bold" && styles.bold,
        align === "center" && styles.center,
        align === "right" && styles.right,
        className,
      ),
      style: toneStyle(tone),
    },
    children,
  );
}
