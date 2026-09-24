"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { cx } from "../tone";
import controls from "../formControls.module.css";
import { clampIndex } from "../Select/keyboard";
import { focusNextControl } from "../../walk";
import { filterComboOptions } from "./filter";
import styles from "./ComboBox.module.css";

export type ComboBoxOption<T extends string = string> = {
  value: T;
  label: string;
  hint?: string;
};

export type ComboBoxProps<T extends string = string> = {
  label: string;
  name: string;
  // The box text, controlled: every keystroke flows to the form, a pick
  // commits an option (taking its value by default).
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboBoxOption<T>[];
  onPick?: (option: ComboBoxOption<T>) => void;
  // Multi-pick consumers keep focus in the search box for another choice.
  advanceOnPick?: boolean;
  // A catalog-only box must not submit its parent form on an unmatched Enter.
  submitOnNoMatch?: boolean;
  // The committed value behind the text (a filter's slug behind the shown
  // label): Escape and an uncommitted close revert the text to its label.
  // Without it the text stays free and the form validates it.
  committedValue?: string;
  emptyText: string;
  error?: string;
  required?: boolean;
  className?: string;
  // Puts input focus in the box on mount (an opening form hands over focus
  // to its first control); the list itself stays closed.
  autoFocus?: boolean;
};

export function ComboBox<T extends string = string>({
  label,
  name,
  value,
  onChange,
  options,
  onPick,
  advanceOnPick = true,
  submitOnNoMatch = true,
  committedValue,
  emptyText,
  error,
  required = false,
  className,
  autoFocus = false,
}: ComboBoxProps<T>) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const errorId = `${baseId}-error`;

  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [open, setOpen] = useState(false);
  // A click opens the whole list (like a select); typing narrows it to the
  // match. Focusing alone never opens: the shell's panel walk owns Tab/arrows
  // on a closed box.
  const [typed, setTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // A commit closes the popup too: the close must not revert the just-picked
  // text back to the committed one.
  const committedRef = useRef(false);

  const matches = typed ? filterComboOptions(options, value) : [...options];
  const active = matches.length === 0 ? 0 : clampIndex(activeIndex, matches.length);
  const committedLabel = options.find((option) => option.value === committedValue)?.label;

  useEffect(() => {
    if (!open) return;
    optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function openList() {
    setTyped(false);
    setActiveIndex(0);
    setOpen(true);
  }

  function commit(index: number) {
    const option = matches[index];
    if (option === undefined) return;
    committedRef.current = true;
    if (onPick) onPick(option);
    else onChange(option.value);
    setTyped(false);
    setOpen(false);
  }

  function revert() {
    if (committedValue !== undefined && committedLabel !== undefined) onChange(committedLabel);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !committedRef.current) revert();
    committedRef.current = false;
    setOpen(nextOpen);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    setTyped(true);
    setActiveIndex(0);
    setOpen(true);
  }

  function closeUncommitted() {
    committedRef.current = true;
    revert();
    setTyped(false);
    setOpen(false);
  }

  // Focus stays in the box (the listbox is operated via aria-activedescendant),
  // so every key is handled here. Plain ↑/↓ on a closed box stay untouched:
  // the shell's panel walk moves focus to the neighbouring control.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing)
      return;
    // Shift+Enter is the form's submit accelerator: leave it to the form.
    if (event.key === "Enter" && event.shiftKey) return;

    if (!open) {
      if (event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => clampIndex(index + 1, matches.length));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => clampIndex(index - 1, matches.length));
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        event.preventDefault();
        setActiveIndex(matches.length - 1);
        return;
      case "Enter":
        // No match: close and let the form submit natively, its validation
        // reports the bad text.
        if (matches.length === 0) {
          if (!submitOnNoMatch) event.preventDefault();
          setOpen(false);
          return;
        }
        event.preventDefault();
        commit(active);
        // A pick advances like ArrowRight: the form's submit lands next.
        if (advanceOnPick && inputRef.current !== null) focusNextControl(inputRef.current);
        return;
      case "Tab":
        // Tab commits like the kit's Select — the highlighted match lands in
        // the field and focus moves on natively; a no-match box reverts to the
        // committed label (or keeps its free text).
        if (matches.length > 0) commit(active);
        else {
          committedRef.current = true;
          revert();
          setOpen(false);
        }
        return;
      case "Escape":
        event.preventDefault();
        closeUncommitted();
        return;
      default:
        return;
    }
  }

  const selected = committedValue ?? value;

  return (
    <div className={cx(controls.field, className)}>
      <label id={labelId} className={controls.label} htmlFor={inputId}>
        {label}
      </label>
      <RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
        {/* Anchor only positions the popup: the box owns the open state, a
            Trigger would toggle it behind our back (and stamp type="button"
            onto the input). */}
        <RadixPopover.Anchor asChild>
          <input
            id={inputId}
            ref={inputRef}
            name={name}
            type="text"
            value={value}
            onChange={handleChange}
            onClick={() => {
              if (!open) openList();
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-activedescendant={open && matches.length > 0 ? optionId(active) : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            required={required}
            autoComplete="off"
            className={controls.control}
          />
        </RadixPopover.Anchor>
        <RadixPopover.Portal>
          <RadixPopover.Content
            className={controls.popup}
            align="start"
            sideOffset={2}
            onOpenAutoFocus={(event) => event.preventDefault()}
            // Focus never leaves the box while the list operates, so the
            // default return-on-close would only snatch it back from wherever
            // the Tab keydown handed it.
            onCloseAutoFocus={(event) => event.preventDefault()}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div id={listboxId} role="listbox" aria-labelledby={labelId} className={controls.list}>
              {matches.length === 0 ? (
                <div className={styles.empty}>{emptyText}</div>
              ) : (
                matches.map((option, index) => (
                  <div
                    key={option.value}
                    id={optionId(index)}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    role="option"
                    aria-selected={option.value === selected}
                    data-active={index === active}
                    className={controls.item}
                    onClick={() => commit(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span aria-hidden="true" className={controls.mark}>
                      X
                    </span>
                    {option.label}
                    {option.hint === undefined ? null : (
                      <span className={styles.hint}> {option.hint}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
      {error ? (
        <span id={errorId} className={controls.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
