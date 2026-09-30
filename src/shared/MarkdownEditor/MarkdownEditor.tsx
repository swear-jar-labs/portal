"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Stack, Text, Textarea, cx } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { Markdown } from "@/shared/Markdown/Markdown";
import { useMemberIdentities } from "@/shared/MemberIdentity";
import { useMentionUsers } from "@/shared/useMentionUsers";
import { EditorTabs, type EditorTab } from "./EditorTabs";
import { EditorToolbar } from "./EditorToolbar";
import { ImageRow } from "./ImageRow";
import {
  applyMentionCompletion,
  matchMentionCandidates,
  mentionQueryBeforeCaret,
  type MentionCandidate,
} from "./mentionComplete";
import { caretGeometry } from "./caretPosition";
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
  // The preview links what the submit will notify about: same resolution.
  const mentionUsers = useMentionUsers(value);
  // @completion: the caret-anchored query, the active roster row and the box.
  // The box opens on a query with matches; Escape dismisses it until the
  // next edit (arrowing the caret around must not pop it back open).
  const identities = useMemberIdentities();
  const [mentionCaret, setMentionCaret] = useState<number | null>(null);
  const [mentionActive, setMentionActive] = useState(0);
  // An Escape dismissal holds until the next edit: arrowing the caret around
  // must not pop the box back open.
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const mentionQuery = mentionCaret === null ? null : mentionQueryBeforeCaret(value, mentionCaret);
  const mentionCandidates =
    mentionQuery === null ? [] : matchMentionCandidates(mentionQuery.query, identities);
  const mentionOpen =
    mentionQuery !== null && tab === "write" && mentionCandidates.length > 0 && !mentionDismissed;
  const safeActive =
    mentionCandidates.length === 0 ? 0 : Math.min(mentionActive, mentionCandidates.length - 1);
  const activeCandidate =
    mentionCandidates.length === 0 ? undefined : mentionCandidates[safeActive];
  // The popup floats over the field at the caret: measured after paint, so a
  // scroll, a resize or a longer roster re-anchors it. The side latches on
  // open and holds while typing: a popup that opened upward stays upward
  // even when room frees below, so the list never jumps mid-word.
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const [mentionAbove, setMentionAbove] = useState<boolean | null>(null);
  const [measureTick, setMeasureTick] = useState(0);

  // The active row follows the query: a changed query restarts at the head.
  function syncMentionCaret(caret: number | null, text: string) {
    const query = caret === null ? null : mentionQueryBeforeCaret(text, caret);
    if (query?.query !== mentionQuery?.query && mentionActive !== 0) setMentionActive(0);
    setMentionCaret(caret);
  }

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

  // Anchor the roster popup at the caret: below the line, or above it when
  // the popup would spill past the viewport bottom and add a page scroll.
  // The box renders hidden first, so the flip measures the real height, not
  // a guess. Measuring after paint and parking the coordinates in state is
  // the layout effect's own job; the equality guards below keep it
  // cascade-free.
  /* eslint-disable react-hooks/set-state-in-effect -- caret anchoring needs post-paint measurement */
  useLayoutEffect(() => {
    if (!mentionOpen) {
      setMentionPos(null);
      setMentionAbove(null);
      return;
    }
    const area = areaRef.current;
    const box = boxRef.current;
    if (area === null || box === null) return;
    const caret = mentionCaret ?? area.selectionStart;
    const geometry = caretGeometry(area, caret);
    const visibleTop = geometry.top - area.scrollTop;
    const visibleLeft = geometry.left - area.scrollLeft;
    // Viewport tails decide the side on open; afterwards the latch holds it:
    // a popup that fits neither way takes the roomier side and scrolls
    // internally (max-height), never the page.
    let above: boolean;
    if (mentionAbove !== null) {
      above = mentionAbove;
    } else {
      const caretViewportTop = area.getBoundingClientRect().top + visibleTop;
      const spaceBelow = window.innerHeight - (caretViewportTop + geometry.lineHeight);
      const spaceAbove = caretViewportTop;
      if (spaceBelow >= box.offsetHeight) above = false;
      else if (spaceAbove >= box.offsetHeight) above = true;
      else above = spaceAbove > spaceBelow;
      setMentionAbove(above);
    }
    const top = area.offsetTop + visibleTop + (above ? -box.offsetHeight : geometry.lineHeight);
    const maxLeft = area.offsetLeft + area.clientWidth - box.offsetWidth;
    const left = Math.min(
      Math.max(area.offsetLeft + visibleLeft, area.offsetLeft),
      Math.max(maxLeft, area.offsetLeft),
    );
    setMentionPos((current) =>
      current !== null && current.top === top && current.left === left ? current : { top, left },
    );
  }, [mentionOpen, mentionAbove, mentionCaret, value, mentionCandidates.length, measureTick]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Any scroll (the field's own, its panel's, the page's) or a viewport
  // resize moves the caret under a parked popup: capture phase hears them all.
  useEffect(() => {
    if (!mentionOpen) return;
    const bump = () => setMeasureTick((tick) => tick + 1);
    window.addEventListener("scroll", bump, true);
    window.addEventListener("resize", bump);
    return () => {
      window.removeEventListener("scroll", bump, true);
      window.removeEventListener("resize", bump);
    };
  }, [mentionOpen]);

  function setArea(node: HTMLTextAreaElement | null) {
    areaRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function applyEdit(edit: CaretEdit) {
    pendingCaret.current = { start: edit.start, end: edit.end };
    setMentionDismissed(false);
    onChange(edit.value);
  }

  function selection(): [number, number] {
    const area = areaRef.current;
    if (area === null) return [value.length, value.length];
    return [area.selectionStart, area.selectionEnd];
  }

  function trackMentionCaret() {
    const area = areaRef.current;
    syncMentionCaret(area === null ? null : area.selectionStart, value);
  }

  function handleValueChange(next: string) {
    setMentionDismissed(false);
    onChange(next);
    const area = areaRef.current;
    syncMentionCaret(area === null ? null : area.selectionStart, next);
  }

  function applyMentionCandidate(candidate: MentionCandidate) {
    if (mentionQuery === null || mentionCaret === null) return;
    const completed = applyMentionCompletion(value, mentionQuery, mentionCaret, candidate.user);
    pendingCaret.current = { start: completed.caret, end: completed.caret };
    setMentionDismissed(false);
    onChange(completed.value);
    setMentionCaret(completed.caret);
    setMentionActive(0);
  }

  // While the roster box is open the completion owns these keys: arrows walk
  // the roster, Enter/Tab completes, Escape parks the box. Everything is
  // stopped so the panel walk and the form never see them.
  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || activeCandidate === undefined) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setMentionActive(
        (current) => (current + delta + mentionCandidates.length) % mentionCandidates.length,
      );
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      applyMentionCandidate(activeCandidate);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setMentionDismissed(true);
      setMentionCaret(null);
    }
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
              <div className={styles.mentionWrap}>
                <Textarea
                  ref={setArea}
                  label={label}
                  name={name}
                  value={value}
                  onChange={handleValueChange}
                  onKeyDown={handleEditorKeyDown}
                  onSelect={trackMentionCaret}
                  rows={rows}
                  required={required}
                  error={error}
                  autoFocus={autoFocus}
                  autoGrow
                  hasPopup
                />
                {mentionOpen ? (
                  <div
                    ref={boxRef}
                    role="listbox"
                    aria-label={copy.mentions.listLabel}
                    className={styles.mentionBox}
                    style={
                      mentionPos === null
                        ? { visibility: "hidden", top: 0, left: 0 }
                        : { top: mentionPos.top, left: mentionPos.left }
                    }
                  >
                    {mentionCandidates.map((candidate, index) => (
                      <div
                        key={candidate.user}
                        role="option"
                        aria-selected={index === safeActive}
                        className={cx(
                          styles.mentionOption,
                          index === safeActive && styles.mentionActive,
                        )}
                        onMouseDown={(event) => {
                          // The click must not move the caret before the splice.
                          event.preventDefault();
                          applyMentionCandidate(candidate);
                        }}
                      >
                        @{candidate.username}
                        {candidate.username === candidate.user ? null : ` (${candidate.user})`}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </Stack>
            {mentionOpen || mentionQuery === null || mentionQuery.query === "" ? null : (
              <Stack navRow>
                <Text role="hint">{copy.mentions.empty}</Text>
              </Stack>
            )}
          </>
        ) : null}
      </Stack>
      {tab === "preview" ? (
        value === "" ? (
          <Text role="hint">{copy.previewEmpty}</Text>
        ) : (
          <div className={styles.preview}>
            <Markdown mentionUsers={mentionUsers}>{value}</Markdown>
          </div>
        )
      ) : null}
    </Stack>
  );
}
