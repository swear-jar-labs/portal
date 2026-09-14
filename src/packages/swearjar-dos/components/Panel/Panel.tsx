import { type ReactNode } from "react";
import { cx } from "../tone";
import styles from "./Panel.module.css";

export type PanelProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  onTitleActivate?: () => void;
  titleActionLabel?: string;
  scroll?: boolean;
  padded?: boolean;
  className?: string;
};

export function Panel({
  title,
  children,
  actions,
  leading,
  onTitleActivate,
  titleActionLabel,
  scroll = true,
  padded = true,
  className,
}: PanelProps) {
  return (
    <section className={cx(styles.panel, className)} aria-label={title}>
      <div className={styles.titleBar}>
        {leading ? <div className={styles.leading}>{leading}</div> : null}
        {onTitleActivate ? (
          <button
            type="button"
            className={styles.titleButton}
            aria-label={titleActionLabel ?? title}
            onClick={onTitleActivate}
          >
            <span className={styles.title}>{title}</span>
          </button>
        ) : (
          <h2 className={styles.title}>{title}</h2>
        )}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      <div className={cx(styles.body, !padded && styles.unpadded, scroll && styles.scroll)}>
        {children}
      </div>
    </section>
  );
}
