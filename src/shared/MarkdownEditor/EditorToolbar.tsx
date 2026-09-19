"use client";

import { Button, Sprite, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";

export type EditorToolbarProps = {
  onCode: () => void;
  onFence: () => void;
  onLink: () => void;
  onImage: () => void;
};

/** The editor's formatting row: one button per wrap, no state of its own. */
export function EditorToolbar({ onCode, onFence, onLink, onImage }: EditorToolbarProps) {
  const copy = messages.editor;
  return (
    <Stack direction="row" gap={4} wrap>
      <Button variant="ghost" onClick={onCode} ariaLabel={copy.tools.code}>
        <Sprite name="code" decorative cell={1} />
      </Button>
      <Button variant="ghost" onClick={onFence} ariaLabel={copy.tools.block}>
        <Sprite name="block" decorative cell={1} />
      </Button>
      <Button variant="ghost" onClick={onLink} ariaLabel={copy.tools.link}>
        <Sprite name="link" decorative cell={1} />
      </Button>
      <Button variant="ghost" onClick={onImage} ariaLabel={copy.image.label}>
        <Sprite name="image" decorative cell={1} />
      </Button>
    </Stack>
  );
}
