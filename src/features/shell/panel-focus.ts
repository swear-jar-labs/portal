import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos";
import { DOC_ZONE } from "./zones";

// The keyboard target of the right panel: the topmost doc panel's scroll body.
// The panel stack renders its layers in order (base first, the open thread
// last), so the last match is the panel the user is looking at.
const PANEL_BODY_SELECTOR = `[${DOS_ZONE_ATTR}="${DOC_ZONE}"] [${DOS_SCROLL_ATTR}]`;

/**
 * Hands the keyboard to the right panel after the file manager opens a program.
 * False when no panel is mounted (the caller armed a request too early).
 */
export function focusPanelBody(): boolean {
  const body = Array.from(document.querySelectorAll<HTMLElement>(PANEL_BODY_SELECTOR)).at(-1);
  if (!body) return false;
  body.focus();
  return true;
}

/**
 * Focuses the panel body of a settled route and keeps the keyboard there: a
 * prerendered page commits its Suspense placeholder first, so the body focused
 * for the route is replaced once the island's chunk arrives. The replacement
 * takes the focus back only while the route still owns the screen and the
 * keyboard sits on the page itself — a control the user already reached keeps
 * it. Returns the stop function for the effect cleanup.
 */
export function keepPanelBodyFocus(route: string): () => void {
  let focused: Element | null = focusPanelBody() ? document.activeElement : null;

  const observer = new MutationObserver(() => {
    if (window.location.pathname !== route) return;
    if (focused?.isConnected) return;
    if (document.activeElement !== document.body) return;
    focused = focusPanelBody() ? document.activeElement : null;
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
