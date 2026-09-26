"use client";

import type { KeyboardEventHandler } from "react";
import styles from "./HorizontalSlider.module.css";

export type HorizontalSliderProps = {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export function HorizontalSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  onKeyDown,
}: HorizontalSliderProps) {
  return (
    <label className={styles.slider}>
      {label}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}
