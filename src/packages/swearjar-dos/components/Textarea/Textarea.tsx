"use client";

import { useId, type ChangeEvent, type KeyboardEvent, type Ref, type SyntheticEvent } from "react";
import { cx } from "../tone";
import styles from "../formControls.module.css";

const DEFAULT_ROWS = 4;

export type TextareaProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  // An inline editor: opening it hands the caret to the text right away.
  autoFocus?: boolean;
  // The field grows with its text (CSS field-sizing under the rows height,
  // capped by CSS) instead of scrolling from the start.
  autoGrow?: boolean;
  // The control itself, for a consumer that moves the caret on its own (the
  // reply target changes hand it back to the field).
  ref?: Ref<HTMLTextAreaElement>;
  className?: string;
  // Caret-aware consumers (the mention completion): key handling, caret
  // tracking, and the popup announcement for the suggestion listbox. The
  // field stays a plain textbox on purpose: promoting it to a combobox would
  // rename the role behind every editor consumer and its specs.
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect?: (event: SyntheticEvent<HTMLTextAreaElement>) => void;
  hasPopup?: boolean;
};

export function Textarea({
  label,
  name,
  value,
  onChange,
  rows = DEFAULT_ROWS,
  placeholder,
  required = false,
  error,
  autoFocus = false,
  autoGrow = false,
  ref,
  className,
  onKeyDown,
  onSelect,
  hasPopup,
}: TextareaProps) {
  // field-sizing sizes to content from zero, ignoring rows: the minimum comes
  // from the rows count in line units, so each consumer keeps its own base.
  const growStyle = autoGrow ? { minHeight: `calc(${rows}lh)` } : undefined;
  const id = useId();
  const errorId = `${id}-error`;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        rows={rows}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-haspopup={hasPopup === true ? "listbox" : undefined}
        className={cx(styles.control, autoGrow && styles.grow)}
        style={growStyle}
      />
      {error ? (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
