"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, DOS_ROW_ATTR, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { useShellDialogs } from "@/features/shell";
import { formatAge } from "@/shared/age";
import { Markdown } from "@/shared/Markdown/Markdown";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { noteElementId, READROOM_CARD_ATTR, type ReadroomNote } from "./readrooms";
import { noteSchema } from "./schema";
import styles from "./readroom.module.css";

const EDIT_ROWS = 4;

export type ReadroomNoteItemProps = {
  note: ReadroomNote;
  now: string;
  // The Markdown body rendered in RSC (a fixture note); a session note or an
  // edited one renders through the same pipeline on the client.
  body?: ReactNode;
  // Set once the note was edited in this session: the body re-renders from it.
  editedBody?: string;
  own: boolean;
  canEdit: boolean;
  onEdit: (body: string) => void;
  onDelete: () => void;
};

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Stack gap={8}>
      <Text as="div">{messages.readroom.notes.delete.text}</Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="danger" onClick={onConfirm}>
          {messages.readroom.notes.delete.confirm}
        </Button>
        <Button onClick={onCancel}>{messages.readroom.notes.edit.cancel}</Button>
      </Stack>
    </Stack>
  );
}

/** A note card: the author, the age, the session's [EDITED] marker and the
 * author's inline editor while the cycle is collecting. */
export function ReadroomNoteItem({
  note,
  now,
  body,
  editedBody,
  own,
  canEdit,
  onEdit,
  onDelete,
}: ReadroomNoteItemProps) {
  const dialogs = useShellDialogs();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [error, setError] = useState<string | undefined>();
  const wasEditing = useRef(false);

  // The closed inline editor unmounts the control the keyboard sat on: the
  // note takes the focus back, so the walk continues from it.
  useEffect(() => {
    const restored = !editing && wasEditing.current;
    wasEditing.current = editing;
    if (!restored) return;
    document.getElementById(noteElementId(note.id))?.focus();
  }, [editing, note.id]);

  function startEdit() {
    setDraft(editedBody ?? note.body);
    setError(undefined);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    const parsed = noteSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.readroom.notes.edit.error);
      return;
    }
    setEditing(false);
    onEdit(parsed.data.body);
  }

  function askDelete() {
    dialogs.open({
      title: messages.readroom.notes.delete.title,
      body: (
        <DeleteConfirm
          onConfirm={() => {
            dialogs.close();
            onDelete();
          }}
          onCancel={dialogs.close}
        />
      ),
    });
  }

  const meta = [formatAge(note.createdAt, now, messages.readroom.age)];
  if (!editing && editedBody !== undefined) meta.push(messages.readroom.notes.edited);

  const content = editing ? (
    <Form onSubmit={saveEdit} onCancel={cancelEdit} ariaLabel={messages.readroom.notes.edit.label}>
      <Stack gap={6}>
        <MarkdownEditor
          label={messages.readroom.notes.edit.label}
          name={`note-edit-${note.id}`}
          value={draft}
          onChange={setDraft}
          rows={EDIT_ROWS}
          error={error}
          autoFocus
        />
        <Stack direction="row" gap={6} navRow>
          <Button type="submit" variant="primary">
            {messages.readroom.notes.edit.save}
          </Button>
          <Button onClick={cancelEdit}>{messages.readroom.notes.edit.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  ) : editedBody !== undefined ? (
    <Markdown>{editedBody}</Markdown>
  ) : (
    (body ?? <Markdown>{note.body}</Markdown>)
  );

  return (
    <div
      id={noteElementId(note.id)}
      className={styles.note}
      tabIndex={0}
      {...{ [READROOM_CARD_ATTR]: "", [DOS_ROW_ATTR]: "" }}
    >
      <Stack gap={4}>
        <Stack direction="row" gap={6} align="center" wrap>
          <MemberLink person={note.author} avatarSize="sm" />
          {own ? (
            <Text as="span" role="accent">
              {messages.readroom.notes.yours}
            </Text>
          ) : null}
          <Text as="span" role="hint">
            {meta.join(" · ")}
          </Text>
          {canEdit && !editing ? (
            <>
              <Button variant="ghost" onClick={startEdit}>
                {messages.readroom.notes.edit.action}
              </Button>
              <Button variant="ghost" onClick={askDelete}>
                {messages.readroom.notes.delete.action}
              </Button>
            </>
          ) : null}
        </Stack>
        {content}
      </Stack>
    </div>
  );
}
