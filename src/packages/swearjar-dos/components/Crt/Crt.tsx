import { type ReactNode } from "react";
import { cx } from "../tone";
import styles from "./Crt.module.css";

export type CrtProps = {
  children: ReactNode;
  scanlines?: boolean;
  vignette?: boolean;
  boot?: boolean;
  className?: string;
};

export function Crt({
  children,
  scanlines = true,
  vignette = true,
  boot = false,
  className,
}: CrtProps) {
  return (
    <div
      className={cx(
        styles.crt,
        scanlines && styles.scanlines,
        vignette && styles.vignette,
        boot && styles.boot,
        className,
      )}
    >
      {children}
    </div>
  );
}
