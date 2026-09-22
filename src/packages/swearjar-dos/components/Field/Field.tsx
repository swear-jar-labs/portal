"use client";

import { useEffect, useId, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { cx } from "../tone";
import styles from "../formControls.module.css";

export type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "search" | "datetime-local";
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  // Puts input focus in the field on mount (an opening form hands over focus
  // to its first control).
  autoFocus?: boolean;
};

export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required = false,
  error,
  onKeyDown,
  className,
  autoFocus = false,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={styles.control}
      />
      {error ? (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
