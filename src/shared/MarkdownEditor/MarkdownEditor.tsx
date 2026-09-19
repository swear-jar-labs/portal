"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { Stack, Text, Textarea } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { Markdown } from "@/shared/Markdown/Markdown";
import { EditorTabs, type EditorTab } from "./EditorTabs";
import { EditorToolbar } from "./EditorToolbar";
import { ImageRow } from "./ImageRow";
import { insertAt, wrapCode, wrapFence, wrapRange, type CaretEdit } from "./selection";
import styles from "./MarkdownEditor.module.css";

const IMAGE_URL_PATTERN = /^https?:\/\/.+/;

export type MarkdownEditorProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  error?: string;
  // An inline editor: opening it hands the caret to the text right away.
  autoFocus?: boolean;
  // The control itself, for a consumer that moves the caret on its own.
  ref?: Ref<HTMLTextAreaElement>;
};

/** A shared Markdown field: a plain textarea with a DOS toolbar, a tabbed
 * preview through the shared pipeline, and images by URL. Picked files are an
 * imitation upload: they preview through object URLs for one SPA session and
 * are never stored — the real upload waits for object storage. */
export function MarkdownEditor({
  label,
  name,
  value,
  onChange,
  rows,
  required,
  error,
  autoFocus,
  ref,
}: MarkdownEditorProps) {
  const copy = messages.editor;
  const [tab, setTab] = useState<EditorTab>("write");
  const [imageOpen, setImageOpen] = useState(false);
  // The image draft lives here, not in the row: switching tabs must not drop it.
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | undefined>();
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCaret = useRef<{ start: number; end: number } | null>(null);
  const blobUrls = useRef<string[]>([]);

  // A toolbar edit computes the next value and caret together; the caret lands
  // once React commits the controlled value.
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    const area = areaRef.current;
    if (area === null) return;
    area.focus();
    area.setSelectionRange(caret.start, caret.end);
  }, [value]);

  // Object URLs die with the session; the store never sees a file.
  useEffect(
    () => () => {
      for (const url of blobUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  function setArea(node: HTMLTextAreaElement | null) {
    areaRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function applyEdit(edit: CaretEdit) {
    pendingCaret.current = { start: edit.start, end: edit.end };
    onChange(edit.value);
  }

  function selection(): [number, number] {
    const area = areaRef.current;
    if (area === null) return [value.length, value.length];
    return [area.selectionStart, area.selectionEnd];
  }

  function insertImage(url: string, alt: string) {
    const [start, end] = selection();
    applyEdit(insertAt(value, start, end, imageMarkup(url, alt)));
  }

  // Angle brackets keep URLs with spaces or parentheses parseable.
  function imageMarkup(url: string, alt: string): string {
    return `![${alt}](<${url}>)`;
  }

  function submitImageUrl() {
    if (!IMAGE_URL_PATTERN.test(imageUrl.trim())) {
      setImageError(copy.image.badUrl);
      return;
    }
    setImageError(undefined);
    insertImage(imageUrl.trim(), "");
    setImageUrl("");
  }

  function pickFile(file: File) {
    const url = URL.createObjectURL(file);
    blobUrls.current.push(url);
    insertImage(url, file.name.replace(/\.[^.]*$/, "") || file.name);
  }

  return (
    <Stack gap={6}>
      {/* Walk, Tab, screen reader and eyes share one order here: tabs,
        toolbar, field. The container never unmounts across tab changes, so
        the keyboard stays on the tab it just pressed. */}
      <Stack gap={6}>
        <Stack navRow>
          <EditorTabs tab={tab} onTab={setTab} />
        </Stack>
        {tab === "write" ? (
          <>
            <Stack navRow>
              <EditorToolbar
                onCode={() => {
                  const [start, end] = selection();
                  applyEdit(wrapCode(value, start, end));
                }}
                onFence={() => {
                  const [start, end] = selection();
                  applyEdit(wrapFence(value, start, end));
                }}
                onLink={() => {
                  const [start, end] = selection();
                  applyEdit(wrapRange(value, start, end, "[", "](https://)"));
                }}
                onImage={() => setImageOpen((open) => !open)}
              />
              {imageOpen ? (
                <ImageRow
                  url={imageUrl}
                  onUrlChange={setImageUrl}
                  error={imageError}
                  onSubmitUrl={submitImageUrl}
                  onPickFile={pickFile}
                />
              ) : null}
            </Stack>
            <Stack navRow>
              <Textarea
                ref={setArea}
                label={label}
                name={name}
                value={value}
                onChange={onChange}
                rows={rows}
                required={required}
                error={error}
                autoFocus={autoFocus}
                autoGrow
              />
            </Stack>
          </>
        ) : null}
      </Stack>
      {tab === "preview" ? (
        value === "" ? (
          <Text role="hint">{copy.previewEmpty}</Text>
        ) : (
          <div className={styles.preview}>
            <Markdown>{value}</Markdown>
          </div>
        )
      ) : null}
    </Stack>
  );
}
