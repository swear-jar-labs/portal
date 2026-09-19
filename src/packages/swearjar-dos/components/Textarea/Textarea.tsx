"use client";

import { useId, type ChangeEvent, type Ref } from "react";
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
        rows={rows}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
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
