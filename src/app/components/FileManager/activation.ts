export type ActivationEvent = {
  button?: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

// A plain activation (left click without modifiers, or no event at all — e.g.
// Enter on the command line) becomes an in-app navigation. Modified clicks and
// the middle button keep the native behavior (new tab).
export function isPlainActivation(event?: ActivationEvent): boolean {
  if (!event) return true;
  return (
    (event.button ?? 0) === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
