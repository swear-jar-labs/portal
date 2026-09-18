import { createElement, type CSSProperties, type ReactNode } from "react";
import { DOS_ROW_ATTR } from "../../attributes";
import { cx } from "../tone";

type StackElement =
  "div" | "section" | "nav" | "header" | "footer" | "main" | "aside" | "article" | "ul";

export type StackProps = {
  children: ReactNode;
  as?: StackElement;
  // A known anchor: focus and scrollIntoView targets stay id-based.
  id?: string;
  direction?: "row" | "column";
  gap?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
  grow?: boolean;
  // A navigation row of the shell's panel walk: ↑/↓ step between rows and ←/→
  // between the focusables inside one (stamps DOS_ROW_ATTR).
  navRow?: boolean;
  // A focusable row (a post) joins its own row as the first control.
  tabIndex?: number;
  className?: string;
};

export function Stack({
  children,
  as = "div",
  id,
  direction = "column",
  gap = 0,
  align,
  justify,
  wrap = false,
  grow = false,
  navRow = false,
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
      id,
      ...(navRow ? { [DOS_ROW_ATTR]: "" } : undefined),
      tabIndex,
    },
    children,
  );
}
