// Shared guards for the kit's window keydown listeners. A listener runs only
// when nobody has handled the event and no IME composition is in progress, and
// command modifiers stay with the browser and the OS (native shortcuts,
// word-wise caret movement). `repeat` is not a guard: it is each listener's own
// policy (the walk and its Shift-scroll repeat with the system auto-repeat, the
// F-keys and the stack's Esc ignore it).

export type KeyboardGuardEvent = Pick<
  KeyboardEvent,
  "defaultPrevented" | "isComposing" | "ctrlKey" | "altKey" | "metaKey"
>;

export function shouldSkipEvent(event: KeyboardGuardEvent): boolean {
  return event.defaultPrevented || event.isComposing;
}

export function hasCommandModifier(event: KeyboardGuardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}
