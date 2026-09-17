import { createElement, type CSSProperties, type ReactNode } from "react";
import { DOS_ROW_ATTR } from "../../attributes";
import { cx } from "../tone";

type StackElement =
  "div" | "section" | "nav" | "header" | "footer" | "main" | "aside" | "article" | "ul";

export type StackProps = {
  children: ReactNode;
  as?: StackElement;
  direction?: "row" | "column";
  gap?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
  grow?: boolean;
  // Stamps the navigation-row contract: the shell's panel walk steps ↑/↓
  // between rows and ←/→ between the focusables inside one.
  row?: boolean;
  // A focusable row (a post) joins its own row as the first control.
  tabIndex?: number;
  className?: string;
};

export function Stack({
  children,
  as = "div",
  direction = "column",
  gap = 0,
  align,
  justify,
  wrap = false,
  grow = false,
  row = false,
  tabIndex,
  className,
}: StackProps) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: direction,
    gap: typeof gap === "number" ? `${gap}px` : gap,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? "wrap" : undefined,
    flexGrow: grow ? 1 : undefined,
    minWidth: 0,
    minHeight: 0,
  };

  return createElement(
    as,
    {
      className: cx(className),
      style,
      ...(row ? { [DOS_ROW_ATTR]: "" } : undefined),
      tabIndex,
    },
    children,
  );
}
