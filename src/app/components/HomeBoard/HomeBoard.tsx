"use client";

import { Heading, Stack, Text } from "@swearjar/dos";
import { docsById } from "@/content/landing";
import { messages } from "@/content/messages";
import { DocView } from "../DocView/DocView";
import { useFileManagerState } from "../DosShell/FileManagerContext";
import { ShellPanel } from "../ShellPanel/ShellPanel";

// DOS flavor path for the empty panel: canonical chrome, not a localizable string.
const EMPTY_PANEL_TITLE = "C:\\";

export function HomeBoard() {
  const { selectedDocId } = useFileManagerState();
  const doc = selectedDocId ? docsById[selectedDocId] : undefined;

  return (
    <ShellPanel title={doc ? doc.title : EMPTY_PANEL_TITLE}>
      {doc ? (
        <DocView doc={doc} />
      ) : (
        <Stack gap={8}>
          <Heading level={1} className="sr-only">
            {messages.shell.doc.emptyHeading}
          </Heading>
          <Text tone="dim">{messages.shell.doc.empty}</Text>
        </Stack>
      )}
    </ShellPanel>
  );
}
