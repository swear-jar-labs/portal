"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { useShellDialogs, useShellSession } from "@/features/shell";
import {
  ModerationTargetControls,
  markEdited,
  markTargetUnavailable,
  targetKey,
  useModeration,
  type ModerationTarget,
} from "@/features/moderation/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { formatAge } from "@/shared/age";
import { ticketCommentSchema } from "../model/schema";
import { freshTicketAccess } from "../data/mock-ticket-access";
import * as ticketStore from "../data/ticket-store";
import { ticketCommentId, ticketPath, type Ticket, type TicketComment } from "../model/tickets";
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
  const session = useShellSession();
  const moderation = useModeration();
  const target: ModerationTarget = {
    kind: "comment",
    id: comment.id,
    author: comment.author.user,
    label: ticket.key,
    href: `${ticketPath(ticket.key)}#${ticketCommentId(comment.id)}`,
    initialBody: comment.body,
    ...(ticketStore.isLocalTicketId(ticket.id) ? { localBody: comment.body } : {}),
  };
  const caseBody = moderation.reports.find(
    (report) => targetKey(report.target) === targetKey(target),
  );
  const currentBody =
    caseBody && caseBody.currentRevision > 1
      ? (caseBody.currentBody ?? comment.body)
      : comment.body;
  const hiddenRecord = moderation.hidden[targetKey(target)];
  const hidden = hiddenRecord !== undefined;
  const canSeeHidden = session?.admin || session?.user === comment.author.user;
  const needsEdit = moderation.reports.some(
    (report) => targetKey(report.target) === targetKey(target) && report.status === "needs-edit",
  );
  const editable = canEdit || (session?.user === comment.author.user && needsEdit);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentBody);
  const [error, setError] = useState<string | undefined>();
  const deleted = comment.deletedAt !== undefined;
  const wasDeleted = useRef(deleted);
  const wasEditing = useRef(editing);

  useEffect(() => {
    const id = ticketCommentId(comment.id);
    if (window.location.hash !== `#${id}`) return;
    const element = document.getElementById(id);
    element?.focus();
    element?.scrollIntoView({ block: "nearest" });
  }, [comment.id]);

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
    setDraft(currentBody);
    setError(undefined);
    setEditing(true);
  }

  async function authorStillAllowed(): Promise<boolean> {
    const access = await freshTicketAccess(project.slug);
    return (
      !!access &&
      (canWriteTicket(access.actor, access.project) || needsEdit) &&
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
    // The save above is author-checked, so a mismatch here is only a session
    // race or a removed target; the ticket store already holds the saved body.
    if (parsed.data.body !== currentBody) markEdited(session, target, parsed.data.body);
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
            markTargetUnavailable(target);
          }}
          onCancel={dialogs.close}
        />
      ),
    });
  }

  const meta = [formatAge(comment.createdAt, now, messages.tickets.age)];
  if (!deleted && (comment.editedAt !== undefined || (caseBody?.currentRevision ?? 1) > 1)) {
    meta.push(messages.tickets.dossier.comments.edited);
  }

  const content = deleted ? (
    <Text as="div" role="hint">
      {messages.tickets.dossier.comments.deleted}
    </Text>
  ) : hidden && !canSeeHidden ? (
    <Text as="div" role="hint">
      {hiddenRecord?.permanent ? messages.moderation.permanentHidden : messages.moderation.hidden}
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
    <Markdown>{currentBody}</Markdown>
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
        {!deleted && !editing && editable ? (
          <>
            <Button variant="ghost" onClick={startEdit}>
              {messages.tickets.dossier.comments.edit}
            </Button>
            <Button variant="ghost" onClick={askDelete}>
              {messages.tickets.dossier.comments.delete}
            </Button>
          </>
        ) : null}
        {!deleted && !editing ? <ModerationTargetControls target={target} mode="action" /> : null}
      </Stack>
      {content}
      {!deleted && hidden && canSeeHidden ? (
        <ModerationTargetControls target={target} mode="status" />
      ) : null}
      {!editing && error === messages.tickets.edit.denied ? (
        <Text role="danger">{error}</Text>
      ) : null}
    </Stack>
  );
}
