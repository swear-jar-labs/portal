"use client";

import { useId, type ChangeEvent } from "react";
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
  className,
}: TextareaProps) {
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
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        rows={rows}
        placeholder={placeholder}
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
