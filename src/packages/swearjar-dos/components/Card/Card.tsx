import { type MouseEvent, type ReactNode } from "react";
import { Heading } from "../Heading/Heading";
import { cx } from "../tone";
import styles from "./Card.module.css";

// How the title activates: a routed card is a stretched link with an optional
// in-app handler; a card without a route is a button, and the handler is what
// keeps it from being a dead control.
type TitleActivation =
  | {
      href: string;
      onActivate?: (event?: MouseEvent<HTMLElement>) => void;
    }
  | {
      href?: never;
      onActivate: (event?: MouseEvent<HTMLElement>) => void;
    };

export type CardProps = {
  // Focus return target: the card link carries the id, so the feed can hand
  // focus back to it after a thread panel pops.
  id?: string;
  title: string;
  // The card whose target is open right now (the thread behind the panel).
  current?: boolean;
  // Markers before the title (pinned, locked), composed by the slice.
  leading?: ReactNode;
  // The non-interactive line around the title (author, counts, activity).
  meta?: ReactNode;
  // The default keeps metadata under the title; a feed can put its byline first.
  metaPosition?: "before" | "after";
  // A consumer with controls in metadata raises only its focusable children
  // above the stretched title link; byline gaps still activate the card.
  metaInteractive?: boolean;
  // Interactive extras raised over the stretched link (tags, vote buttons).
  actions?: ReactNode;
  className?: string;
} & TitleActivation;

/**
 * A DOS card: the title is a link stretched over the whole card, so the card
 * reads as one target. Interactive parts belong in `actions`; the meta line
 * stays click-through.
 */
export function Card({
  id,
  title,
  href,
  current = false,
  leading,
  meta,
  metaPosition = "after",
  metaInteractive = false,
  actions,
  onActivate,
  className,
}: CardProps) {
  const metaSlot = meta ? (
    <div
      className={cx(
        styles.meta,
        metaPosition === "before" && styles.metaBefore,
        metaInteractive && styles.metaInteractive,
      )}
    >
      {meta}
    </div>
  ) : null;

  return (
    <article className={cx(styles.card, current && styles.current, className)}>
      {metaPosition === "before" ? metaSlot : null}
      <div className={styles.titleRow}>
        {leading ? <span className={styles.leading}>{leading}</span> : null}
        <Heading level={3} className={styles.heading}>
          {href === undefined ? (
            <button
              type="button"
              id={id}
              className={cx(styles.link, styles.button)}
              onClick={onActivate}
            >
              {title}
            </button>
          ) : (
            <a
              id={id}
              className={styles.link}
              href={href}
              aria-current={current ? "true" : undefined}
              onClick={onActivate}
              onKeyDown={(event) => {
                // A link activates natively on Enter only; Space is the shell's
                // activation idiom, so a card with an in-app handler forwards it
                // like a click. Without one, Space stays native.
                if (!onActivate) return;
                if (event.key !== " ") return;
                event.preventDefault();
                onActivate();
              }}
            >
              {title}
            </a>
          )}
        </Heading>
      </div>
      {metaPosition === "after" ? metaSlot : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </article>
  );
}
