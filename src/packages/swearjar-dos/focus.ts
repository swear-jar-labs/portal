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

// Steps through list rows when the current one may be scrolled out of its
// region: a visible current keeps the plain step with wrap-around, while a
// current that is not in sight (or absent, -1) enters the visible area from
// the edge in the direction of travel — ↓ lands on the first visible row, ↑ on
// the last one. Without a visible row the step falls back to the list edge.
export function nextStepIndex(
  count: number,
  current: number,
  step: 1 | -1,
  isVisible: (index: number) => boolean,
): number {
  if (current >= 0 && current < count && isVisible(current)) {
    return nextControlIndex(count, current, step);
  }
  for (let index = step === 1 ? 0 : count - 1; index >= 0 && index < count; index += step) {
    if (isVisible(index)) return index;
  }
  return nextControlIndex(count, current, step);
}

// Whether the element sits inside the region's usable viewport: its client box
// inset by the region's scroll padding, so a sticky header declared through
// `scroll-padding-top` stays outside the visible area.
export function isInScrollView(element: Element, region: Element): boolean {
  const box = region.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(region);
  const insetTop = Number.parseFloat(style.scrollPaddingTop) || 0;
  const insetBottom = Number.parseFloat(style.scrollPaddingBottom) || 0;
  return rect.bottom > box.top + insetTop && rect.top < box.bottom - insetBottom;
}
