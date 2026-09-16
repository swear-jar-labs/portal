import { createElement, type ReactNode } from "react";
import { DOS_ROLE_ATTR } from "../../attributes";
import { cx, toneStyle, type TextRole, type Tone } from "../tone";
import styles from "./Text.module.css";

type TextBaseProps = {
  children: ReactNode;
  as?: "p" | "span" | "div" | "strong" | "em";
  className?: string;
};

// UI text: the role owns color, weight, size and stroke.
type TextRoleProps = {
  role?: Exclude<TextRole, "heading">;
  tone?: never;
  weight?: never;
};

// Content text (markdown, boot): tone colors and manual bold on the body role.
type TextContentProps = {
  role?: never;
  tone?: Tone;
  weight?: "bold";
};

export type TextProps = TextBaseProps & (TextRoleProps | TextContentProps);

export function Text({ children, as = "p", role, tone, weight, className }: TextProps) {
  return createElement(
    as,
    {
      [DOS_ROLE_ATTR]: role ?? "body",
      className: cx(styles.text, weight === "bold" && styles.bold, className),
      style: toneStyle(tone),
    },
    children,
  );
}
