import type { CSSProperties } from "react";

export type Tone =
  "default" | "dim" | "white" | "black" | "blue" | "cyan" | "green" | "yellow" | "red" | "magenta";

export const toneColor: Record<Tone, string> = {
  default: "var(--dos-light-gray)",
  dim: "var(--dos-dark-gray)",
  white: "var(--dos-white)",
  black: "var(--dos-black)",
  blue: "var(--dos-light-blue)",
  cyan: "var(--dos-light-cyan)",
  green: "var(--dos-light-green)",
  yellow: "var(--dos-yellow)",
  red: "var(--dos-light-red)",
  magenta: "var(--dos-light-magenta)",
};

export function toneStyle(tone: Tone | undefined): CSSProperties | undefined {
  if (!tone || tone === "default") return undefined;
  return { color: toneColor[tone] };
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
