"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Button, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellDialogs } from "@/features/shell";
import { Markdown } from "@/shared/Markdown/Markdown";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { MemberLink } from "./MemberLink";
import { formatAge, type ThreadPost } from "./threads";
import { postElementId, postHash } from "./post-anchor";
import { replySchema } from "./schema";
import type { ReplyTarget } from "./thread-actions";
import { VoteButton } from "./VoteButton";
import styles from "./board.module.css";

const EDIT_ROWS = 4;
const REPLY_MARKER_GLYPH = "↪";

export type PostItemProps = {
  post: ThreadPost;
  now: string;
  // The Markdown body rendered in RSC (fixture posts); session posts render
  // through the same pipeline on the client.
  body?: ReactNode;
  voted: boolean;
  // Set once the post was edited in this session: the body re-renders from it.
  editedBody?: string;
  deleted: boolean;
  canEdit: boolean;
  // A locked thread takes no replies: the control disappears from the header.
  canReply: boolean;
  // The parent this post answers, resolved by the thread view; absent means a
  // root post. The excerpt is missing when the parent is a tombstone.
  replyTo?: ReplyTarget;
  onToggleVote: () => void;
  onReply: () => void;
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
  canReply,
  replyTo,
  onToggleVote,
  onReply,
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
    document.getElementById(postElementId(post.id))?.focus();
  }, [deleted, editing, post.id]);

  // The jump is navigation, not history: the hash makes the anchor shareable,
  // replaceState keeps Back closing the thread instead of walking posts.
  function jumpToParent() {
    if (replyTo === undefined) return;
    window.history.replaceState(window.history.state, "", postHash(replyTo.id));
    const parent = document.getElementById(postElementId(replyTo.id));
    parent?.focus();
    parent?.scrollIntoView({ block: "nearest" });
  }

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
        <MarkdownEditor
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
    <Markdown>{editedBody}</Markdown>
  ) : (
    (body ?? <Markdown>{post.body}</Markdown>)
  );

  return (
    <Stack
      id={postElementId(post.id)}
      as="article"
      gap={4}
      className={styles.post}
      navRow
      tabIndex={0}
    >
      <Stack direction="row" gap={6} align="center" wrap>
        <MemberLink member={post.author} />
        <Text as="span" role="hint">
          {meta.join(" · ")}
        </Text>
        {replyTo !== undefined ? (
          <Button
            variant="ghost"
            ariaLabel={`${messages.board.post.replyToAria} ${replyTo.user}`}
            onClick={jumpToParent}
          >
            {REPLY_MARKER_GLYPH}
            <Avatar user={replyTo.user} src={replyTo.avatar} size="sm" />
            {replyTo.excerpt === undefined ? replyTo.user : `${replyTo.user}: "${replyTo.excerpt}"`}
          </Button>
        ) : null}
        {!deleted && !editing ? (
          <>
            <VoteButton
              votes={post.votes + (voted ? 1 : 0)}
              voted={voted}
              onToggle={onToggleVote}
            />
            {canReply ? (
              <Button variant="ghost" onClick={onReply}>
                {messages.board.post.reply}
              </Button>
            ) : null}
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
