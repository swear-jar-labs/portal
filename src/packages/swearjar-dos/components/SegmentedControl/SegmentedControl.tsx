"use client";

import { useRef, type KeyboardEvent } from "react";
import { Text } from "../Text/Text";
import styles from "./SegmentedControl.module.css";

export type SegmentedOption<T extends string> = { value: T; label: string };
export type SegmentedTabOption<T extends string> = SegmentedOption<T> & {
  id: string;
  panelId: string;
};

type BaseProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
};

export type SegmentedControlProps<T extends string> = BaseProps<T> &
  (
    | { mode: "tabs"; options: readonly SegmentedTabOption<T>[] }
    | { mode: "buttons"; options: readonly SegmentedOption<T>[] }
  );

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement | null>());

  function selectFromKey(event: KeyboardEvent<HTMLButtonElement>, current: T) {
    if (props.mode !== "tabs" || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const index = props.options.findIndex((option) => option.value === current);
    const next =
      event.key === "ArrowRight"
        ? props.options[(index + 1) % props.options.length]
        : event.key === "ArrowLeft"
          ? props.options[(index - 1 + props.options.length) % props.options.length]
          : event.key === "Home"
            ? props.options[0]
            : event.key === "End"
              ? props.options[props.options.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    props.onChange(next.value);
    refs.current.get(next.value)?.focus();
  }

  return (
    <div
      role={props.mode === "tabs" ? "tablist" : "group"}
      aria-label={props.label}
      className={styles.control}
    >
      {props.options.map((option) => {
        const tab = props.mode === "tabs" && "panelId" in option ? option : null;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current.set(option.value, element);
            }}
            id={tab?.id}
            type="button"
            role={props.mode === "tabs" ? "tab" : undefined}
            aria-selected={props.mode === "tabs" ? props.value === option.value : undefined}
            aria-pressed={props.mode === "buttons" ? props.value === option.value : undefined}
            aria-controls={tab?.panelId}
            tabIndex={props.mode === "tabs" && props.value !== option.value ? -1 : 0}
            onClick={() => props.onChange(option.value)}
            onKeyDown={(event) => selectFromKey(event, option.value)}
            className={styles.segment}
          >
            <Text as="span">{option.label}</Text>
          </button>
        );
      })}
    </div>
  );
}
