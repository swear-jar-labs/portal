"use client";

import type { ChangeEvent, ReactNode } from "react";
import styles from "./Button.module.css";

export function FileButton({
  children,
  accept,
  onChange,
}: {
  children: ReactNode;
  accept?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={`${styles.button} ${styles.fileButton}`}>
      {children}
      <input className={styles.fileInput} type="file" accept={accept} onChange={onChange} />
    </label>
  );
}
