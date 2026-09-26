"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { messages } from "@/content/messages";
import { overlayLayerPanels, PanelStack, ShellPanel, useOverlayTop } from "@/features/shell";

/** The standalone public profile hosts threads in the same panel stack. */
export function MemberStack({ children }: { children: ReactNode }) {
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers]);

  return (
    <PanelStack onCloseTop={overlayOpen ? closeOverlay : undefined}>
      <ShellPanel title={messages.members.panelTitle} closable>
        {children}
      </ShellPanel>
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
