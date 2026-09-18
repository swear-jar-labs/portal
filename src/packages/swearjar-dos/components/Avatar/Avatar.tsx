import { cx } from "../tone";
import styles from "./Avatar.module.css";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  user: string;
  // The picture of the user; the fallback is a colored square with the first
  // letter of the name (uploads arrive with the backend).
  src?: string;
  size?: AvatarSize;
  className?: string;
};

// Direct CGA palette (not the remapping tone vars): the fallback square has to
// carry a black letter on the dark feed and on the light form windows alike.
const FALLBACK_COLORS = [
  "var(--dos-light-cyan)",
  "var(--dos-yellow)",
  "var(--dos-light-green)",
  "var(--dos-light-magenta)",
  "var(--dos-light-red)",
  "var(--dos-light-blue)",
] as const;

function fallbackColor(user: string): string {
  let hash = 0;
  for (const char of user) hash += char.codePointAt(0) ?? 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length] ?? FALLBACK_COLORS[0];
}

/** The user's avatar; the name always sits next to it, so it is decorative. */
export function Avatar({ user, src, size = "sm", className }: AvatarProps) {
  return (
    <span className={cx(styles.avatar, styles[size], className)} aria-hidden="true">
      {src ? (
        <img className={styles.image} src={src} alt="" />
      ) : (
        <span className={styles.letter} style={{ background: fallbackColor(user) }}>
          {user.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
