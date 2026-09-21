"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "../tone";
import controls from "../formControls.module.css";
import { clampIndex, typeaheadIndex } from "./keyboard";
import { focusNextControl } from "../../walk";
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openList(index = Math.max(selectedIndex, 0)) {
    setActiveIndex(index);
    setOpen(true);
  }

  function commit(index: number, advance = false) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    // A keyboard pick advances like ArrowRight, like the ComboBox does.
    if (advance && triggerRef.current !== null) focusNextControl(triggerRef.current);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(nextOpen);
  }

  // Focus stays on the trigger (the listbox is operated via aria-activedescendant),
  // so every key is handled here.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    // Shift+Enter is the form's submit accelerator: leave it to the form
    // instead of opening or committing the list.
    if (event.key === "Enter" && event.shiftKey) return;

    if (!open) {
      // Enter, Space and Alt+↓ open the list. Plain ↑/↓ stay untouched: the
      // shell's panel walk moves focus to the neighbouring control.
      if (
        event.key === "Enter" ||
        event.key === " " ||
        (event.altKey && event.key === "ArrowDown")
      ) {
        event.preventDefault();
        openList();
        return;
      }
      if (event.altKey) return;
      // A printable key opens the list at the first match (type-ahead) and must
      // never reach the shell's global command-line capture.
      if (event.key.length !== 1 || event.key === " ") return;
      event.preventDefault();
      const match = typeaheadIndex(
        options.map((option) => option.label),
        Math.max(selectedIndex, 0),
        event.key,
      );
      if (match !== undefined) openList(match);
      return;
    }

    if (event.altKey) return;

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
        commit(activeIndex, true);
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
          ref={triggerRef}
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
            className={controls.popup}
            align="start"
            sideOffset={2}
            onOpenAutoFocus={(event) => event.preventDefault()}
            // Focus never leaves the trigger while the list operates, so the
            // default return-on-close would only snatch it back from wherever
            // the Tab keydown handed it (e.g. the shell's panel toggle).
            onCloseAutoFocus={(event) => event.preventDefault()}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div id={listboxId} role="listbox" aria-labelledby={labelId} className={controls.list}>
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
                  className={controls.item}
                  onClick={() => commit(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span aria-hidden="true" className={controls.mark}>
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
