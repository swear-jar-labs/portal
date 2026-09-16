// Focusable controls in DOM order, shared by the shell's panel keyboard model
// (↑/↓ walking the controls of the right-hand window) and the dialog arrow
// cycle. Hidden inputs are skipped: focus() on them is a no-op, and a control
// walk must never stall on one.
// "Smart" controls — native date/time/number pickers, ranges and radios — keep
// their own arrow handling, so the walk leaves them out entirely: a control
// that consumes arrows natively must never have focus pulled away from it.
const SMART_INPUT_TYPES = [
  "radio",
  "range",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "number",
] as const;

const INPUT_EXCLUSIONS = SMART_INPUT_TYPES.map((type) => `:not([type='${type}'])`).join("");

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  `input:not([disabled]):not([type='hidden'])${INPUT_EXCLUSIONS}`,
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

// Steps through a control list with wrap-around; current -1 means "focus sits
// outside the list" (window surface, title bar) and enters from the matching edge.
export function nextControlIndex(count: number, current: number, step: 1 | -1): number {
  if (current < 0) return step === 1 ? 0 : count - 1;
  return (current + step + count) % count;
}
