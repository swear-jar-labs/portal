"use client";

import { useId, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Button, shouldSkipEvent, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import styles from "./MarkdownEditor.module.css";

export type ImageRowProps = {
  url: string;
  onUrlChange: (url: string) => void;
  error?: string;
  onSubmitUrl: () => void;
  onPickFile: (file: File) => void;
};

/** The image source row: a URL field plus the imitation-upload button. The URL
 * and its error live in the editor (the row must not lose them); the file
 * input lives here next to its button. Enter in the URL field inserts: a
 * native input inside a form would submit it instead (the kit Form only takes
 * Shift+Enter), so the key is stopped here — outside an IME composition. */
export function ImageRow({ url, onUrlChange, error, onSubmitUrl, onPickFile }: ImageRowProps) {
  const copy = messages.editor;
  const urlInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || shouldSkipEvent(event.nativeEvent)) return;
    event.preventDefault();
    onSubmitUrl();
  }

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onPickFile(file);
    event.target.value = "";
  }

  return (
    <Stack gap={6} className={styles.imageRow}>
      <Stack direction="row" gap={6} wrap>
        <label className={styles.imageLabel} htmlFor={urlInputId}>
          {copy.image.urlLabel}
        </label>
        <input
          id={urlInputId}
          className={styles.imageInput}
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          onKeyDown={submitOnEnter}
          placeholder="https://"
          inputMode="url"
        />
        <Button onClick={onSubmitUrl} ariaLabel={copy.image.insert}>
          {copy.image.insert}
        </Button>
      </Stack>
      {error ? (
        <Text as="span" role="danger">
          {error}
        </Text>
      ) : null}
      <Stack direction="row" gap={6} align="center" wrap>
        <Text as="span">{copy.image.fileOr}</Text>
        <Button onClick={() => fileInputRef.current?.click()}>{copy.image.fileButton}</Button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={pickFile}
          tabIndex={-1}
          aria-hidden="true"
        />
      </Stack>
      <Text role="hint">{copy.image.temp}</Text>
    </Stack>
  );
}
