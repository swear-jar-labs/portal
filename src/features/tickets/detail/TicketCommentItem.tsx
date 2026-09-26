"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { useShellDialogs } from "@/features/shell";
import { Markdown } from "@/shared/Markdown/Markdown";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { formatAge } from "@/shared/age";
import { ticketCommentSchema } from "../model/schema";
import { freshTicketAccess } from "../data/mock-ticket-access";
import * as ticketStore from "../data/ticket-store";
import { ticketCommentId, type Ticket, type TicketComment } from "../model/tickets";
import { canWriteTicket, type TicketProject } from "../model/workflow";
import styles from "../tickets.module.css";

const EDIT_ROWS = 3;

export type TicketCommentItemProps = {
  ticket: Ticket;
  project: TicketProject;
  comment: TicketComment;
  now: string;
  // The logged-on member wrote this comment: only the author edits or deletes.
  canEdit: boolean;
};

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Stack gap={8}>
      <Text as="div">{messages.tickets.dossier.comments.deleteText}</Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="danger" onClick={onConfirm}>
          {messages.tickets.dossier.comments.deleteConfirm}
        </Button>
        <Button onClick={onCancel}>{messages.tickets.dossier.comments.cancel}</Button>
      </Stack>
    </Stack>
  );
}

/** One dossier comment: the author may edit it inline or leave a tombstone;
 * everyone else only reads it (the board's post pattern). */
export function TicketCommentItem({
  ticket,
  project,
  comment,
  now,
  canEdit,
}: TicketCommentItemProps) {
  const dialogs = useShellDialogs();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | undefined>();
  const deleted = comment.deletedAt !== undefined;
  const wasDeleted = useRef(deleted);
  const wasEditing = useRef(editing);

  // The tombstone and the closed inline editor both unmount the control the
  // keyboard sat on: the comment takes the focus back, so the walk continues
  // from it.
  useEffect(() => {
    const restored = (deleted && !wasDeleted.current) || (!editing && wasEditing.current);
    wasDeleted.current = deleted;
    wasEditing.current = editing;
    if (!restored) return;
    document.getElementById(ticketCommentId(comment.id))?.focus();
  }, [comment.id, deleted, editing]);

  function startEdit() {
    setDraft(comment.body);
    setError(undefined);
    setEditing(true);
  }

  async function authorStillAllowed(): Promise<boolean> {
    const access = await freshTicketAccess(project.slug);
    return (
      !!access &&
      canWriteTicket(access.actor, access.project) &&
      access.actor?.user === comment.author.user
    );
  }

  async function saveEdit() {
    const parsed = ticketCommentSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.tickets.dossier.comments.error);
      return;
    }
    if (!(await authorStillAllowed())) {
      setError(messages.tickets.edit.denied);
      return;
    }
    setEditing(false);
    ticketStore.editTicketComment(ticket.id, comment.id, parsed.data.body, comment.author.user);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function askDelete() {
    dialogs.open({
      title: messages.tickets.dossier.comments.deleteTitle,
      body: (
        <DeleteConfirm
          onConfirm={async () => {
            dialogs.close();
            if (!(await authorStillAllowed())) {
              setError(messages.tickets.edit.denied);
              return;
            }
            ticketStore.deleteTicketComment(ticket.id, comment.id, comment.author.user);
          }}
          onCancel={dialogs.close}
        />
      ),
    });
  }

  const meta = [formatAge(comment.createdAt, now, messages.tickets.age)];
  if (!deleted && comment.editedAt !== undefined) {
    meta.push(messages.tickets.dossier.comments.edited);
  }

  const content = deleted ? (
    <Text as="div" role="hint">
      {messages.tickets.dossier.comments.deleted}
    </Text>
  ) : editing ? (
    <Form
      onSubmit={saveEdit}
      onCancel={cancelEdit}
      ariaLabel={messages.tickets.dossier.comments.editLabel}
    >
      <Stack gap={6}>
        <MarkdownEditor
          label={messages.tickets.dossier.comments.editLabel}
          name={`comment-${comment.id}`}
          value={draft}
          onChange={setDraft}
          rows={EDIT_ROWS}
          error={error}
          autoFocus
        />
        <Stack direction="row" gap={6}>
          <Button type="submit" variant="primary">
            {messages.tickets.dossier.comments.save}
          </Button>
          <Button onClick={cancelEdit}>{messages.tickets.dossier.comments.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  ) : (
    <Markdown>{comment.body}</Markdown>
  );

  return (
    <Stack
      id={ticketCommentId(comment.id)}
      as="article"
      gap={4}
      className={styles.comment}
      navRow
      tabIndex={0}
    >
      <Stack direction="row" gap={6} align="center" wrap>
        <MemberLink person={comment.author} avatarSize="sm" />
        <Text as="span" role="hint">
          {meta.join(" · ")}
        </Text>
        {!deleted && !editing && canEdit ? (
          <>
            <Button variant="ghost" onClick={startEdit}>
              {messages.tickets.dossier.comments.edit}
            </Button>
            <Button variant="ghost" onClick={askDelete}>
              {messages.tickets.dossier.comments.delete}
            </Button>
          </>
        ) : null}
      </Stack>
      {content}
      {!editing && error === messages.tickets.edit.denied ? (
        <Text role="danger">{error}</Text>
      ) : null}
    </Stack>
  );
}
