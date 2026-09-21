"use client";

import { useRef, type ChangeEvent } from "react";
import { Button, Link, RemoveButton, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { formatSize } from "@/lib/format";
import type { ReadroomAttachment } from "./readrooms";

export type ReadroomFilesRowProps = {
  attachments: readonly ReadroomAttachment[];
  // The lead's controls appear while the cycle is active; a reader sees the
  // list alone (and nothing when it is empty).
  editable: boolean;
  onAdd: (files: FileList) => void;
  onRemove: (attachment: ReadroomAttachment) => void;
};

/** The task's attached files: a DOS row of download links with sizes. The mock
 * storage lives one SPA session (see ./attachments); the picker is the same
 * documented `.click()` exception as the editor's image row. */
export function ReadroomFilesRow({
  attachments,
  editable,
  onAdd,
  onRemove,
}: ReadroomFilesRowProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  if (!editable && attachments.length === 0) return null;

  function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files;
    if (picked !== null && picked.length > 0) onAdd(picked);
    event.target.value = "";
  }

  return (
    <Stack gap={4}>
      <Stack direction="row" gap={8} align="center" wrap navRow>
        <Text as="span" role="hint">
          {messages.readroom.files.label}
        </Text>
        {attachments.length === 0 ? (
          <Text as="span" role="hint">
            {messages.readroom.files.empty}
          </Text>
        ) : (
          attachments.map((attachment) => (
            <Stack key={attachment.id} direction="row" gap={4} align="center">
              <Link href={attachment.url} download={attachment.name}>
                {attachment.name}
              </Link>
              <Text as="span" role="hint">
                {formatSize(attachment.size)}
              </Text>
              {editable ? (
                <RemoveButton
                  ariaLabel={`${messages.readroom.files.remove} ${attachment.name}`}
                  onClick={() => onRemove(attachment)}
                />
              ) : null}
            </Stack>
          ))
        )}
        {editable ? (
          <>
            <Button onClick={() => fileInputRef.current?.click()}>
              {messages.readroom.files.attach}
            </Button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              multiple
              onChange={pickFiles}
              tabIndex={-1}
              aria-hidden="true"
            />
          </>
        ) : null}
      </Stack>
      {editable ? <Text role="hint">{messages.readroom.files.temp}</Text> : null}
    </Stack>
  );
}
