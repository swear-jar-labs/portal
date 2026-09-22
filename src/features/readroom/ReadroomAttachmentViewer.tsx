"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { formatSize } from "@/lib/format";
import {
  MAX_PREVIEW_BYTES,
  readAttachmentPreview,
  type AttachmentPreview,
} from "./attachment-preview";
import type { ReadroomAttachment } from "./readrooms";
import styles from "./attachments.module.css";

export function ReadroomAttachmentViewer({
  attachment,
  onClose,
}: {
  attachment: ReadroomAttachment;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<AttachmentPreview | { status: "loading" }>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();
    void readAttachmentPreview(attachment, controller.signal).then((result) => {
      if (!controller.signal.aborted) setPreview(result);
    });
    return () => controller.abort();
    // The store hands stable attachment objects, but the effect only needs
    // the identity: an inline array map must not restart the read.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the stable identity (id/url), not the object.
  }, [attachment.id, attachment.url]);

  const copy = messages.readroom.files.preview;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`${copy.title}: ${attachment.name}`}
      closeLabel={messages.shell.window.closeLabel}
      surface="paper"
      className={styles.viewer}
      footer={
        <Button href={attachment.url} download={attachment.name}>
          {copy.download}
        </Button>
      }
    >
      <Stack gap={8}>
        <Text role="hint">{formatSize(attachment.size)}</Text>
        {preview.status === "text" ? (
          preview.text === "" ? (
            <Text role="hint">{copy.empty}</Text>
          ) : (
            <pre className={styles.source}>
              <code>{preview.text}</code>
            </pre>
          )
        ) : (
          <Text role={preview.status === "error" ? "danger" : "hint"}>
            {copy[preview.status]}
            {preview.status === "tooLarge" ? ` (${formatSize(MAX_PREVIEW_BYTES)})` : ""}
          </Text>
        )}
      </Stack>
    </Dialog>
  );
}
