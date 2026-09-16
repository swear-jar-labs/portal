// Shared guards for the shell's window keydown listeners. A listener runs only
// when nobody has handled the event and no IME composition is in progress, and
// command modifiers stay with the browser and the OS (native shortcuts,
// word-wise caret movement). `repeat` is not a guard: it is each listener's own
// policy (the walk and the F-keys ignore it, the panel scroll allows it).

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
