import { type ReactNode } from "react";
import { DOS_CRT_ATTR } from "../../attributes";
import styles from "./Crt.module.css";

export type CrtProps = {
  children: ReactNode;
};

// The CRT screen: the app lives inside it; its pseudo-element layers are the
// global scanline/vignette filter. Keep the screen animation-free — a transform
// would trap the filter in a stacking context (the shell owns the switch-on).
export function Crt({ children }: CrtProps) {
  return (
    <div className={styles.crt} {...{ [DOS_CRT_ATTR]: "" }}>
      {children}
    </div>
  );
}
