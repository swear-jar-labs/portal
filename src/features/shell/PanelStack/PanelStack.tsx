"use client";

import { Children, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { DOS_SCROLL_ATTR, hasCommandModifier, shouldSkipEvent } from "@swearjar/dos";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../attributes";
import { useShellControls } from "../ShellControls";
import { usePublishSearchAvailability } from "../SearchAvailability";
import { panelStackInset } from "./inset";
import styles from "./PanelStack.module.css";

type LayerStyle = CSSProperties & {
  "--dos-panel-stack-inset": string;
  "--dos-panel-stack-level": number;
};

export type PanelStackProps = {
  // Layers in stack order: the base route first, then each deeper detail.
  children: ReactNode;
  // Esc pops the top layer (the shell's back affordance for deep panels).
  onCloseTop?: () => void;
  // The base panel owns the shell's search field; other layers make it inert.
  searchable?: boolean;
};

/**
 * The right-hand panel stack: layers share one cell, each deeper panel reveals
 * the preceding title bars and everything below the top becomes inert.
 */
export function PanelStack({ children, onCloseTop, searchable = false }: PanelStackProps) {
  const layers = Children.toArray(children);
  const controlsEnabled = useShellControls();
  const stackRef = useRef<HTMLDivElement>(null);
  const topIndex = layers.length - 1;
  // The cascade is a stack property: a lone layer spans the whole panel area;
  // every following layer reveals one more title bar below it.
  const stacked = layers.length > 1;
  usePublishSearchAvailability(searchable ? !stacked : null);
  const hasTop = stacked && onCloseTop !== undefined;

  useEffect(() => {
    if (!hasTop) return;
    // An anchor that resolves names its own focus target (a note, a write-up,
    // a post): the target's own effect takes it, the stack stays out of the
    // way. An unknown hash (or none) falls back to the layer body below.
    // Opening a layer hands it the keyboard otherwise: its body is the scroll
    // region, so the arrows scroll a long thread (a Dialog without controls
    // does the same).
    if (
      window.location.hash !== "" &&
      document.getElementById(window.location.hash.slice(1)) !== null
    )
      return;
    const body = stackRef.current?.lastElementChild?.querySelector<HTMLElement>(
      `[${DOS_SCROLL_ATTR}]`,
    );
    body?.focus();
  }, [hasTop, topIndex]);

  useEffect(() => {
    if (!hasTop || !controlsEnabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event)) return;
      if (hasCommandModifier(event)) return;
      if (event.key !== "Escape") return;
      // Holding Esc is still one close: the route change owes the pop.
      if (event.repeat) return;
      event.preventDefault();
      onCloseTop();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controlsEnabled, hasTop, onCloseTop]);

  return (
    <div ref={stackRef} className={styles.stack}>
      {layers.map((layer, index) => {
        const isTop = index === topIndex;
        const style: LayerStyle = {
          "--dos-panel-stack-inset": stacked ? panelStackInset(index) : "0px",
          "--dos-panel-stack-level": index,
        };
        return (
          <div
            key={index}
            className={isTop && stacked ? styles.top : styles.layer}
            style={style}
            inert={isTop ? undefined : true}
            {...{ [DOC_LAYER_ATTR]: "" }}
            {...(isTop ? { [DOC_TOP_ATTR]: "" } : undefined)}
          >
            {layer}
          </div>
        );
      })}
    </div>
  );
}
