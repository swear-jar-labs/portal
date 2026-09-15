import { createElement, type ReactNode } from "react";
import { cx, toneStyle, type Tone } from "../tone";
import styles from "./List.module.css";

export type ListProps = {
  items: ReactNode[];
  ordered?: boolean;
  marker?: boolean;
  tone?: Tone;
  className?: string;
};

export function List({ items, ordered = false, marker = true, tone, className }: ListProps) {
  return createElement(
    ordered ? "ol" : "ul",
    {
      className: cx(styles.list, ordered && styles.ordered, !marker && styles.noMarker, className),
      style: toneStyle(tone),
    },
    items.map((item, index) => createElement("li", { key: index, className: styles.item }, item)),
  );
}
