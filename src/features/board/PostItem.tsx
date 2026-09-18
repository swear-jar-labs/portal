"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Button, Form, Stack, Text, Textarea } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellDialogs } from "@/features/shell";
import { formatAge, type ThreadPost } from "@/shared/board/threads";
import { replySchema } from "./schema";
import { VoteButton } from "./VoteButton";
import styles from "./board.module.css";

const EDIT_ROWS = 4;

const postItemId = (id: string) => `board-post-${id}`;

export type PostItemProps = {
  post: ThreadPost;
  now: string;
  // The Markdown body rendered in RSC (fixture posts); session posts have none
  // and read as plain text until the backend can re-render them.
  body?: ReactNode;
  voted: boolean;
  // Set once the post was edited in this session: the body becomes plain text.
  editedBody?: string;
  deleted: boolean;
  canEdit: boolean;
  onToggleVote: () => void;
  onEdit: (body: string) => void;
  onDelete: () => void;
};

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Stack gap={8}>
      <Text as="div">{messages.board.post.deleteText}</Text>
      <Text as="div" role="hint">
        {messages.board.post.deleteHint}
      </Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="danger" onClick={onConfirm}>
          {messages.board.post.deleteConfirm}
        </Button>
        <Button onClick={onCancel}>{messages.board.post.cancel}</Button>
      </Stack>
    </Stack>
  );
}

export function PostItem({
  post,
  now,
  body,
  voted,
  editedBody,
  deleted,
  canEdit,
  onToggleVote,
  onEdit,
  onDelete,
}: PostItemProps) {
  const dialogs = useShellDialogs();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [error, setError] = useState<string | undefined>();
  const wasDeleted = useRef(deleted);
  const wasEditing = useRef(editing);

  // The tombstone and the closed inline editor both unmount the control the
  // keyboard sat on: the post takes the focus back, so the walk continues from
  // it. (A post that mounts already deleted or not editing does not steal it.)
  useEffect(() => {
    const restored = (deleted && !wasDeleted.current) || (!editing && wasEditing.current);
    wasDeleted.current = deleted;
    wasEditing.current = editing;
    if (!restored) return;
    document.getElementById(postItemId(post.id))?.focus();
  }, [deleted, editing, post.id]);

  function startEdit() {
    setDraft(editedBody ?? post.body);
    setError(undefined);
    setEditing(true);
  }

  function saveEdit() {
    const parsed = replySchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.board.post.error);
      return;
    }
    setEditing(false);
    onEdit(parsed.data.body);
  }

  function askDelete() {
    dialogs.open({
      title: messages.board.post.deleteTitle,
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

  const meta = [messages.board.roles[post.author.role], formatAge(post.createdAt, now)];
  if (!deleted && editedBody !== undefined) meta.push(messages.board.post.edited);

  const content = deleted ? (
    <Text as="div" role="hint">
      {messages.board.post.deleted}
    </Text>
  ) : editing ? (
    <Form onSubmit={saveEdit} ariaLabel={messages.board.post.editLabel}>
      <Stack gap={6}>
        <Textarea
          label={messages.board.post.editLabel}
          name={`post-${post.id}`}
          value={draft}
          onChange={setDraft}
          rows={EDIT_ROWS}
          error={error}
          autoFocus
        />
        <Stack direction="row" gap={6}>
          <Button type="submit" variant="primary">
            {messages.board.post.save}
          </Button>
          <Button onClick={() => setEditing(false)}>{messages.board.post.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  ) : editedBody !== undefined ? (
    <Text as="div" className={styles.plain}>
      {editedBody}
    </Text>
  ) : (
    (body ?? (
      <Text as="div" className={styles.plain}>
        {post.body}
      </Text>
    ))
  );

  return (
    <Stack
      id={postItemId(post.id)}
      as="article"
      gap={4}
      className={styles.post}
      navRow
      tabIndex={0}
    >
      <Stack direction="row" gap={6} align="center" wrap>
        <Avatar user={post.author.user} src={post.author.avatar} size="md" />
        <Text as="span">{post.author.user}</Text>
        <Text as="span" role="hint">
          {meta.join(" · ")}
        </Text>
        {!deleted && !editing ? (
          <>
            <VoteButton
              votes={post.votes + (voted ? 1 : 0)}
              voted={voted}
              onToggle={onToggleVote}
            />
            {canEdit ? (
              <>
                <Button variant="ghost" onClick={startEdit}>
                  {messages.board.post.edit}
                </Button>
                <Button variant="ghost" onClick={askDelete}>
                  {messages.board.post.delete}
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </Stack>
      {content}
    </Stack>
  );
}
