"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ShellPanel } from "./ShellPanel/ShellPanel";
import { stackMemory } from "./stack-memory";
import { claimOverlayHost, useOverlayLayers, type OverlayLayer } from "./overlay-store";

/** The stack's in-flight close flag, reset when the chain changes. */
type OverlayCloseRef = { current: boolean };

/**
 * Returns focus to the link or card that opened an overlay layer after the
 * layer pops (browser back or Esc): the base stays mounted under the
 * intercept, so the stable origin id is still a valid target. Pops one memory
 * entry per dropped layer; a jump that drops several focuses the origin
 * closest to the base.
 */
export function useOverlayFocusReturn(layers: readonly OverlayLayer[]): void {
  const previousKeys = useRef<readonly string[]>([]);
  useEffect(() => {
    const previous = previousKeys.current;
    const next = layers.map((entry) => entry.key);
    previousKeys.current = next;
    const dropped = previous.length - next.length;
    if (dropped <= 0) return;
    let target: string | null = null;
    for (let index = 0; index < dropped; index += 1) {
      target = stackMemory.takePendingOverlayFocus() ?? target;
    }
    if (target) document.getElementById(target)?.focus();
  }, [layers]);
}

/**
 * The store layers as the top of the calling section stack: each panel reads
 * as its own ShellPanel so the cascade, insets, inert and the single Esc
 * listener stay the PanelStack's. Returns a flat element array (not a
 * component) so the panels are direct children of the stack and
 * `Children.toArray` counts them as layers.
 */
export function overlayLayerPanels(
  layers: readonly OverlayLayer[],
  onClose: () => void,
): ReactNode[] {
  return layers.flatMap((layer) =>
    layer.panels.map((panel, panelIndex) => (
      <ShellPanel
        key={`${layer.key}:${panelIndex}`}
        title={panel.title}
        actions={<CloseButton onClose={onClose} label={messages.shell.window.closeLabel} />}
      >
        {panel.body}
      </ShellPanel>
    )),
  );
}

/**
 * The browser tab title of an open overlay: a soft navigation applies the
 * base page's metadata (parallel-route metadata is not used), so the store's
 * documentTitle drives the title while layers are open, and the title of the
 * base page is restored when the chain empties.
 */
export function OverlayDocumentTitle() {
  const layers = useOverlayLayers();
  const baseTitle = useRef<string | null>(null);

  useEffect(() => {
    const top = layers.at(-1);
    if (top === undefined) {
      if (baseTitle.current !== null) {
        document.title = baseTitle.current;
        baseTitle.current = null;
      }
      return;
    }
    if (baseTitle.current === null) baseTitle.current = document.title;
    if (top.documentTitle !== undefined) document.title = top.documentTitle;
  }, [layers]);

  return null;
}

/**
 * The overlay end of a section stack: the layers, a closer that peels the top
 * with browser back (store layers always arrive with a SPA push, so back
 * always returns to the base), and the open flag for closeTop ordering and
 * the closingRef reset. Claims the host role while the stack is mounted.
 */
export function useOverlayTop(closingRef: OverlayCloseRef): {
  overlayLayers: readonly OverlayLayer[];
  overlayOpen: boolean;
  closeOverlay: () => boolean;
} {
  const router = useRouter();
  const overlayLayers = useOverlayLayers();

  // The claim is a mount effect: StrictMode mounts, unmounts (release runs),
  // and remounts (claim runs again) — balanced by the release closure.
  useEffect(() => claimOverlayHost(), []);

  const closeOverlay = useCallback(() => {
    if (overlayLayers.length === 0 || closingRef.current) return false;
    closingRef.current = true;
    router.back();
    return true;
  }, [closingRef, overlayLayers.length, router]);

  return { overlayLayers, overlayOpen: overlayLayers.length > 0, closeOverlay };
}
