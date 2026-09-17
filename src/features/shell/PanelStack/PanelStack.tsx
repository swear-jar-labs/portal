"use client";

import { Children, useEffect, useRef, type ReactNode } from "react";
import { DOS_SCROLL_ATTR } from "@swearjar/dos";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../attributes";
import { hasCommandModifier, shouldSkipEvent } from "../hooks/keyboard";
import { useShellControls } from "../ShellControls";
import styles from "./PanelStack.module.css";

export type PanelStackProps = {
  // Layers in stack order: the base route panel first, the open thread last.
  children: ReactNode;
  // Esc pops the top layer (the shell's back affordance for deep panels).
  onCloseTop?: () => void;
};

/**
 * The right-hand panel stack: layers share one cell, the top one cascades over
 * the base and everything below it becomes inert.
 */
export function PanelStack({ children, onCloseTop }: PanelStackProps) {
  const layers = Children.toArray(children);
  const controlsEnabled = useShellControls();
  const stackRef = useRef<HTMLDivElement>(null);
  const topIndex = layers.length - 1;
  // The cascade is a stack property: a lone layer spans the whole panel area,
  // the offset and the raised context belong to the top of two or more.
  const stacked = layers.length > 1;
  const hasTop = stacked && onCloseTop !== undefined;

  useEffect(() => {
    if (!hasTop) return;
    // Opening a layer hands it the keyboard: its body is the scroll region, so
    // the arrows scroll a long thread (a Dialog without controls does the same).
    const body = stackRef.current?.lastElementChild?.querySelector<HTMLElement>(
      `[${DOS_SCROLL_ATTR}]`,
    );
    body?.focus();
  }, [hasTop]);

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
        return (
          <div
            key={index}
            className={isTop && stacked ? styles.top : styles.layer}
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
