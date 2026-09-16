import { type ReactNode } from "react";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "../../attributes";
import { cx } from "../tone";
import styles from "./Panel.module.css";

export type PanelSurface = "dark" | "light";

export type PanelProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  onTitleActivate?: () => void;
  titleActionLabel?: string;
  scroll?: boolean;
  padded?: boolean;
  zone?: string;
  surface?: PanelSurface;
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
  zone,
  surface = "dark",
  className,
}: PanelProps) {
  const zoneAttrs = zone ? { [DOS_ZONE_ATTR]: zone } : undefined;

  return (
    <section
      className={cx(styles.panel, surface === "light" && styles.light, className)}
      aria-label={title}
      {...zoneAttrs}
    >
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
      <div
        className={cx(styles.body, !padded && styles.unpadded, scroll && styles.scroll)}
        tabIndex={scroll ? 0 : undefined}
        {...(scroll ? { [DOS_SCROLL_ATTR]: "" } : undefined)}
      >
        {children}
      </div>
    </section>
  );
}
