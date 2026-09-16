"use client";

import { useId, type ChangeEvent, type KeyboardEvent } from "react";
import { cx } from "../tone";
import styles from "./Checkbox.module.css";

export type CheckboxProps = {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function Checkbox({ label, name, checked, onChange, className }: CheckboxProps) {
  const id = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.checked);
  }

  // The DOS model activates with Enter; Space stays native. Shift+Enter is not
  // ours: the form owns it as its submit accelerator.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    onChange(!checked);
  }

  return (
    <div className={cx(styles.field, className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={styles.box}
      />
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
