"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CloseButton, hasCommandModifier, shouldSkipEvent } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { PanelStack } from "./PanelStack/PanelStack";
import { ShellPanel } from "./ShellPanel/ShellPanel";
import { clearOverlay, useOverlayLayers } from "./overlay-store";
import { useShellControls } from "./ShellControls";

/**
 * The fallback panel stack for pages without a section stack (/admin, the
 * standalone profile): the store layers render here instead of the page, so
 * an overlay opened from them still reads as a layer. A lone layer spans the
 * whole panel area; PanelStack only binds Esc for stacked layers, so the host
 * binds its own keydown to peel even a single overlay.
 */
export function OverlayHost() {
  const router = useRouter();
  const layers = useOverlayLayers();
  const controlsEnabled = useShellControls();
  // A close owns the navigation until the route changes: a second Esc landing
  // in that window must not pop another layer (the section stacks' guard).
  const closingRef = useRef(false);

  useEffect(() => {
    closingRef.current = false;
  }, [layers]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    router.back();
  }, [router]);

  useEffect(() => {
    if (!controlsEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event)) return;
      if (hasCommandModifier(event)) return;
      if (event.key !== "Escape") return;
      if (event.repeat) return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, controlsEnabled]);

  return (
    <PanelStack onCloseTop={close}>
      {layers.flatMap((layer) =>
        layer.panels.map((panel, index) => (
          <ShellPanel
            key={`${layer.key}:${index}`}
            title={panel.title}
            actions={<CloseButton onClose={close} label={messages.shell.window.closeLabel} />}
          >
            {panel.body}
          </ShellPanel>
        )),
      )}
    </PanelStack>
  );
}

/** The slot default's clearer: routes without an interceptor drop the chain. */
export function OverlayClear() {
  useEffect(() => {
    clearOverlay();
  }, []);
  return null;
}
