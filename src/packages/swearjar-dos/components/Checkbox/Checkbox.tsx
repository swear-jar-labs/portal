"use client";

import { useId, type ChangeEvent } from "react";
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

  return (
    <div className={cx(styles.field, className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className={styles.box}
      />
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
