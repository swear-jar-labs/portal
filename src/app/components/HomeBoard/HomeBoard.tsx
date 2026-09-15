"use client";

import { Heading, Stack, Text } from "@swearjar/dos";
import type { ReactNode } from "react";
import type { DocId } from "@/content/docs";
import { messages } from "@/content/messages";
import { useFileManagerState } from "../FileManager/FileManagerContext";
import { ShellPanel } from "../ShellPanel/ShellPanel";

// DOS flavor path for the empty panel: canonical chrome, not a localizable string.
const EMPTY_PANEL_TITLE = "C:\\";

export type HomeBoardDoc = {
  id: DocId;
  title: string;
  content: ReactNode;
};

export type HomeBoardProps = {
  docs: readonly HomeBoardDoc[];
};

export function HomeBoard({ docs }: HomeBoardProps) {
  const { selectedDocId } = useFileManagerState();
  const doc = docs.find((entry) => entry.id === selectedDocId);

  return (
    <ShellPanel title={doc ? doc.title : EMPTY_PANEL_TITLE}>
      {doc ? (
        doc.content
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
