"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "../tone";
import controls from "../formControls.module.css";
import { clampIndex, typeaheadIndex } from "./keyboard";
import styles from "./Select.module.css";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export type SelectProps<T extends string> = {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  error?: string;
  className?: string;
};

export function Select<T extends string>({
  label,
  name,
  value,
  onChange,
  options,
  error,
  className,
}: SelectProps<T>) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const triggerId = `${baseId}-trigger`;
  const listboxId = `${baseId}-listbox`;
  const errorId = `${baseId}-error`;

  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(selectedIndex, 0));
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openList() {
    setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(nextOpen);
  }

  // Focus stays on the trigger (the listbox is operated via aria-activedescendant),
  // so every key is handled here.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;

    if (!open) {
      const opens =
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " ";
      if (!opens) return;
      event.preventDefault();
      openList();
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => clampIndex(index + 1, options.length));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => clampIndex(index - 1, options.length));
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        return;
      case "Tab":
        commit(activeIndex);
        return;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        return;
      default: {
        const next = typeaheadIndex(
          options.map((option) => option.label),
          activeIndex,
          event.key,
        );
        if (next === undefined) return;
        event.preventDefault();
        setActiveIndex(next);
      }
    }
  }

  return (
    <div className={cx(controls.field, className)}>
      <label id={labelId} className={controls.label} htmlFor={triggerId}>
        {label}
      </label>
      <RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
        <RadixPopover.Trigger
          id={triggerId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(controls.control, styles.trigger)}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.value}>{current?.label ?? value}</span>
          <span aria-hidden="true" className={styles.icon}>
            [▼]
          </span>
        </RadixPopover.Trigger>
        <RadixPopover.Portal>
          <RadixPopover.Content
            className={styles.content}
            align="start"
            sideOffset={2}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div id={listboxId} role="listbox" aria-labelledby={labelId} className={styles.listbox}>
              {options.map((option, index) => (
                <div
                  key={option.value}
                  id={optionId(index)}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={option.value === value}
                  data-active={index === activeIndex}
                  className={styles.option}
                  onClick={() => commit(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span aria-hidden="true" className={styles.indicator}>
                    X
                  </span>
                  {option.label}
                </div>
              ))}
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
      <input type="hidden" name={name} value={value} readOnly />
      {error ? (
        <span id={errorId} className={controls.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
