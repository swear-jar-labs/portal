"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { CloseButton } from "@swearjar/dos";
import { ModerationPreview, ModerationPreviewProvider } from "@/features/moderation/contracts";
import { overlayLayerPanels, PanelStack, ShellPanel, useOverlayTop } from "@/features/shell";

/** Admin owns a base panel, so links from its queues can open target panels
 * above it and return to the same queue and focused link. */
export function AdminStack({ children }: { children: ReactNode }) {
  const closingRef = useRef(false);
  const { overlayLayers, closeOverlay } = useOverlayTop(closingRef);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewOrigin = useRef<string | null>(null);

  const openPreview = useCallback((reportId: string, originId: string) => {
    previewOrigin.current = originId;
    setPreviewId(reportId);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewId(null);
  }, []);

  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers]);

  useEffect(() => {
    if (previewId !== null || previewOrigin.current === null) return;
    const id = previewOrigin.current;
    previewOrigin.current = null;
    document.getElementById(id)?.focus();
  }, [previewId]);

  const closeTop = () => {
    if (overlayLayers.length > 0) closeOverlay();
    else if (previewId !== null) closePreview();
  };

  return (
    <ModerationPreviewProvider open={openPreview}>
      <PanelStack onCloseTop={closeTop}>
        <ShellPanel title={fileTitle("ADMIN")} closable>
          {children}
        </ShellPanel>
        {previewId === null ? null : (
          <ShellPanel
            title={messages.moderation.previewHeading}
            actions={
              <CloseButton onClose={closePreview} label={messages.shell.window.closeLabel} />
            }
          >
            <ModerationPreview reportId={previewId} />
          </ShellPanel>
        )}
        {overlayLayerPanels(overlayLayers, closeOverlay)}
      </PanelStack>
    </ModerationPreviewProvider>
  );
}
