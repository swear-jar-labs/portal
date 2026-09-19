"use client";

import { Button, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";

export type EditorTab = "write" | "preview";

export type EditorTabsProps = {
  tab: EditorTab;
  onTab: (tab: EditorTab) => void;
};

/** The editor's mode switch. It never unmounts across tab changes (unlike the
 * field and the toolbar), so the keyboard stays on the tab it just pressed. */
export function EditorTabs({ tab, onTab }: EditorTabsProps) {
  const copy = messages.editor;
  return (
    <Stack direction="row" gap={4} wrap>
      <Button
        variant={tab === "write" ? "default" : "ghost"}
        onClick={() => onTab("write")}
        ariaLabel={copy.writeTab}
        ariaPressed={tab === "write"}
      >
        {copy.writeTab}
      </Button>
      <Button
        variant={tab === "preview" ? "default" : "ghost"}
        onClick={() => onTab("preview")}
        ariaLabel={copy.previewTab}
        ariaPressed={tab === "preview"}
      >
        {copy.previewTab}
      </Button>
    </Stack>
  );
}
