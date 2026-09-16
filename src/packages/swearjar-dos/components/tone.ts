import type { CSSProperties } from "react";

export type Tone =
  "default" | "dim" | "white" | "black" | "blue" | "cyan" | "green" | "yellow" | "red" | "magenta";

// Panels and windows share two surfaces: the dark default and the light
// form-like one (the prototype's .win-body.form).
export type Surface = "dark" | "light";

// Typography roles: the semantic UI-text contract (Text and Heading). The role
// table in tokens.css keys off data-dos-role and owns color, weight, size,
// line-height and tracking; tones stay the content palette.
export const textRoles = ["body", "hint", "accent", "danger", "positive", "heading"] as const;

export type TextRole = (typeof textRoles)[number];

// Tone colors are theme hooks: tokens.css holds the dark palette and the
// surface class (Panel surface="light") remaps --dos-tone-*.
export const toneColor: Record<Tone, string> = {
  default: "var(--dos-tone-default)",
  dim: "var(--dos-tone-dim)",
  white: "var(--dos-tone-white)",
  black: "var(--dos-tone-black)",
  blue: "var(--dos-tone-blue)",
  cyan: "var(--dos-tone-cyan)",
  green: "var(--dos-tone-green)",
  yellow: "var(--dos-tone-yellow)",
  red: "var(--dos-tone-red)",
  magenta: "var(--dos-tone-magenta)",
};

export function toneStyle(tone: Tone | undefined): CSSProperties | undefined {
  if (!tone || tone === "default") return undefined;
  return { color: toneColor[tone] };
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
