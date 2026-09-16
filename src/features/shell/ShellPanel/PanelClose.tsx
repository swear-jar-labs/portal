"use client";

import { CloseButton } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useFileManagerState } from "../FileManager/FileManagerContext";
import { DEFAULT_DOC_ID } from "../FileManager/useFileManager";

// Closing an inner window returns to the shell's default document (ABOUT):
// the [X] is the mouse path home, the file list and F-keys stay the shortcuts.
export function PanelClose() {
  const { openCommand } = useFileManagerState();

  return (
    <CloseButton
      onClose={() => openCommand(DEFAULT_DOC_ID)}
      label={messages.shell.window.closeLabel}
    />
  );
}
