"use client";

import { SegmentedControl } from "@swearjar/dos";
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
    <SegmentedControl
      mode="buttons"
      label={copy.modeLabel}
      options={[
        { value: "write", label: copy.writeTab },
        { value: "preview", label: copy.previewTab },
      ]}
      value={tab}
      onChange={onTab}
    />
  );
}
