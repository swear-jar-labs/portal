import { type ReactNode } from "react";
import { DOS_SCROLL_ATTR, DOS_SURFACE_ATTR, DOS_ZONE_ATTR } from "../../attributes";
import { cx, type Surface } from "../tone";
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
  zone?: string;
  surface?: Surface;
  titleTone?: "default" | "blue";
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
  surface = "light",
  titleTone = "default",
  className,
}: PanelProps) {
  const zoneAttrs = zone ? { [DOS_ZONE_ATTR]: zone } : undefined;
  const surfaceAttrs = { [DOS_SURFACE_ATTR]: surface };

  return (
    <section
      className={cx(styles.panel, titleTone === "blue" && styles.blueTitle, className)}
      aria-label={title}
      {...zoneAttrs}
      {...surfaceAttrs}
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
