"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Button, Link, RemoveButton, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { formatSize } from "@/lib/format";
import { classifyAttachment } from "./attachment-preview";
import { ReadroomAttachmentViewer } from "./ReadroomAttachmentViewer";
import type { ReadroomAttachment } from "./readrooms";
import styles from "./attachments.module.css";

export type ReadroomFilesRowProps = {
  attachments: readonly ReadroomAttachment[];
  editable: boolean;
  onAdd: (files: FileList) => void;
  onRemove: (attachment: ReadroomAttachment) => void;
};

/** Shared by the task and its draft: text opens in the viewer, binaries download.
 * Blobs belong to the caller; closing the viewer never releases a task's file. */
export function ReadroomFilesRow({
  attachments,
  editable,
  onAdd,
  onRemove,
}: ReadroomFilesRowProps) {
  const rowId = useId();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const returnFocusRef = useRef<string | null>(null);
  const attachment = attachments.find((entry) => entry.id === viewingId);
  const pickerId = `${rowId}-picker`;
  const fileId = (id: string) => `${rowId}-${id}`;

  useEffect(() => {
    if (attachment !== undefined || returnFocusRef.current === null) return;
    document.getElementById(returnFocusRef.current)?.focus();
    returnFocusRef.current = null;
  }, [attachment]);

  if (!editable && attachments.length === 0) return null;

  function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files;
    if (picked !== null && picked.length > 0) onAdd(picked);
    event.target.value = "";
  }

  function removeFile(file: ReadroomAttachment) {
    const index = attachments.indexOf(file);
    const next = attachments[index + 1] ?? attachments[index - 1];
    onRemove(file);
    // Known controls survive removal; the native picker is the empty-list fallback.
    document.getElementById(next ? fileId(next.id) : pickerId)?.focus();
  }

  return (
    <Stack gap={4}>
      <Text role="hint">{messages.readroom.files.label}</Text>
      {attachments.length === 0 ? (
        <Text role="hint">{messages.readroom.files.empty}</Text>
      ) : (
        attachments.map((file) => (
          <Stack key={file.id} direction="row" gap={8} align="center" wrap navRow>
            {/* An undecided name opens the viewer optimistically: the content
              sniff on open still refuses true binaries with a download. */}
            {classifyAttachment(file) !== "binary" ? (
              <Button
                id={fileId(file.id)}
                variant="ghost"
                className={styles.filename}
                ariaLabel={`${messages.readroom.files.preview.open} ${file.name}`}
                onClick={() => {
                  returnFocusRef.current = fileId(file.id);
                  setViewingId(file.id);
                }}
              >
                {file.name}
              </Button>
            ) : (
              <Link
                id={fileId(file.id)}
                href={file.url}
                download={file.name}
                className={styles.filename}
              >
                {file.name}
              </Link>
            )}
            <Text as="span" role="hint">
              {formatSize(file.size)}
            </Text>
            {editable ? (
              <RemoveButton
                ariaLabel={`${messages.readroom.files.remove} ${file.name}`}
                onClick={() => removeFile(file)}
              />
            ) : null}
          </Stack>
        ))
      )}
      {editable ? (
        <Stack gap={4}>
          <Stack direction="row" navRow>
            <label className={styles.picker}>
              {messages.readroom.files.attach}
              <input id={pickerId} type="file" multiple onChange={pickFiles} />
            </label>
          </Stack>
          <Text role="hint">{messages.readroom.files.temp}</Text>
        </Stack>
      ) : null}
      {attachment ? (
        <ReadroomAttachmentViewer
          key={attachment.id}
          attachment={attachment}
          onClose={() => setViewingId(null)}
        />
      ) : null}
    </Stack>
  );
}
