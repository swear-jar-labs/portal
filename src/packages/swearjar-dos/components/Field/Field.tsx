"use client";

import { useId, type ChangeEvent, type KeyboardEvent } from "react";
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
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

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
