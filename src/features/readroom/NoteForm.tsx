"use client";

import { useState, type Ref } from "react";
import { Button, Form, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { avatarFor } from "@/shared/members";
import { addNote } from "./readroom-store";
import { noteSchema } from "./schema";

const NOTE_ROWS = 3;

export type NoteFormProps = {
  readroomId: string;
  // The field itself: the view takes the caret back after the author deletes
  // their note and the form returns.
  fieldRef?: Ref<HTMLTextAreaElement>;
};

/** The task's inline note composer: open while the cycle collects and the
 * reader has not posted yet (one note per reader). A guest keeps the draft:
 * the shell's logon prompt takes over. */
export function NoteForm({ readroomId, fieldRef }: NoteFormProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit() {
    const parsed = noteSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.readroom.notes.form.error);
      return;
    }
    if (session === null) {
      requestLogin();
      return;
    }
    setError(undefined);
    setDraft("");
    addNote(readroomId, parsed.data.body, { user: session.user, avatar: avatarFor(session.user) });
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.readroom.notes.form.label}>
      <Stack gap={6} navRow>
        <MarkdownEditor
          ref={fieldRef}
          label={messages.readroom.notes.form.label}
          name={`note-${readroomId}`}
          value={draft}
          onChange={setDraft}
          rows={NOTE_ROWS}
          error={error}
        />
        <Stack direction="row" gap={6}>
          <Button type="submit" variant="primary">
            {messages.readroom.notes.form.submit}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
