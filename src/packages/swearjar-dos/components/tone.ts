import type { CSSProperties } from "react";

export type Tone =
  "default" | "dim" | "white" | "black" | "blue" | "cyan" | "green" | "yellow" | "red" | "magenta";

// Tone colors are theme hooks: a surface class (Panel surface="light") may
// override --dos-tone-*; the fallback keeps the dark look.
export const toneColor: Record<Tone, string> = {
  default: "var(--dos-tone-default, var(--dos-light-gray))",
  dim: "var(--dos-tone-dim, var(--dos-text-dim))",
  white: "var(--dos-tone-white, var(--dos-white))",
  black: "var(--dos-tone-black, var(--dos-black))",
  blue: "var(--dos-tone-blue, var(--dos-light-blue))",
  cyan: "var(--dos-tone-cyan, var(--dos-light-cyan))",
  green: "var(--dos-tone-green, var(--dos-light-green))",
  yellow: "var(--dos-tone-yellow, var(--dos-yellow))",
  red: "var(--dos-tone-red, var(--dos-light-red))",
  magenta: "var(--dos-tone-magenta, var(--dos-light-magenta))",
};

export function toneStyle(tone: Tone | undefined): CSSProperties | undefined {
  if (!tone || tone === "default") return undefined;
  return { color: toneColor[tone] };
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
