import { createElement, type CSSProperties, type ReactNode } from "react";
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

  return createElement(as, { className: cx(className), style }, children);
}
