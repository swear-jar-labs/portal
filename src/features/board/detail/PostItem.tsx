"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellDialogs } from "@/features/shell";
import { Markdown } from "@/shared/Markdown/Markdown";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { TextAction } from "@/shared/TextAction/TextAction";
import { MemberAvatar, useMemberIdentity } from "@/shared/MemberIdentity";
import { MemberLink } from "@/features/members/contracts";
import {
  ModerationTargetControls,
  markEdited,
  markTargetUnavailable,
  targetKey,
  useModeration,
  type ModerationTarget,
} from "@/features/moderation/contracts";
import { useShellSession } from "@/features/shell";
import { formatAge, threadPath, type ThreadPost } from "../model/threads";
import { postElementId, postHash } from "../model/post-anchor";
import { replySchema } from "../model/schema";
import { isLocalThreadId } from "../data/board-store";
import type { ReplyTarget } from "../data/thread-actions";
import { VoteButton } from "../list/VoteButton";
import styles from "../board.module.css";

const EDIT_ROWS = 4;
const REPLY_MARKER_GLYPH = "↪";

export type PostItemProps = {
  post: ThreadPost;
  threadId: string;
  threadTitle: string;
  root: boolean;
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
        <Button variant="danger" className={styles.dialogAction} onClick={onConfirm}>
          {messages.board.post.deleteConfirm}
        </Button>
        <Button className={styles.dialogAction} onClick={onCancel}>
          {messages.board.post.cancel}
        </Button>
      </Stack>
    </Stack>
  );
}

export function PostItem({
  post,
  threadId,
  threadTitle,
  root,
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
  const session = useShellSession();
  const moderation = useModeration();
  const target: ModerationTarget = {
    kind: "post",
    id: post.id,
    author: post.author.user,
    label: threadTitle,
    href: `${threadPath(threadId)}${postHash(post.id)}`,
    ...(root ? { rootThreadId: threadId } : {}),
    initialBody: editedBody ?? post.body,
    ...(isLocalThreadId(threadId) ? { localBody: editedBody ?? post.body } : {}),
  };
  const caseBody = moderation.reports.find(
    (report) => targetKey(report.target) === targetKey(target),
  );
  const currentBody =
    caseBody && caseBody.currentRevision > 1
      ? (caseBody.currentBody ?? editedBody ?? post.body)
      : (editedBody ?? post.body);
  const hiddenRecord = moderation.hidden[targetKey(target)];
  const hidden = hiddenRecord !== undefined;
  const canSeeHidden = session?.admin || session?.user === post.author.user;
  const replyIdentity = useMemberIdentity(replyTo ?? { user: "" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [error, setError] = useState<string | undefined>();
  const wasDeleted = useRef(deleted);
  const wasEditing = useRef(editing);

  useEffect(() => {
    const id = postElementId(post.id);
    if (window.location.hash !== `#${id}`) return;
    const element = document.getElementById(id);
    element?.focus();
    element?.scrollIntoView({ block: "center" });
  }, [post.id]);

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
    setDraft(currentBody);
    setError(undefined);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    const parsed = replySchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.board.post.error);
      return;
    }
    setEditing(false);
    onEdit(parsed.data.body);
    // canEdit is author-only, so a mismatch here is only a session race or a
    // removed target; the section store already holds the saved body.
    if (parsed.data.body !== currentBody) markEdited(session, target, parsed.data.body);
  }

  function askDelete() {
    dialogs.open({
      title: messages.board.post.deleteTitle,
      body: (
        <DeleteConfirm
          onConfirm={() => {
            dialogs.close();
            onDelete();
            markTargetUnavailable(target);
          }}
          onCancel={dialogs.close}
        />
      ),
    });
  }

  const meta = [messages.board.roles[post.author.role], formatAge(post.createdAt, now)];
  if (!deleted && (editedBody !== undefined || (caseBody?.currentRevision ?? 1) > 1))
    meta.push(messages.board.post.edited);

  const content = deleted ? (
    <Text as="div" role="hint">
      {messages.board.post.deleted}
    </Text>
  ) : hidden && !canSeeHidden ? (
    <Text as="div" role="hint">
      {hiddenRecord?.permanent ? messages.moderation.permanentHidden : messages.moderation.hidden}
    </Text>
  ) : editing ? (
    <Form onSubmit={saveEdit} onCancel={cancelEdit} ariaLabel={messages.board.post.editLabel}>
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
          <Button onClick={cancelEdit}>{messages.board.post.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  ) : editedBody !== undefined || (caseBody?.currentRevision ?? 1) > 1 ? (
    <Markdown>{currentBody}</Markdown>
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
        <MemberLink person={post.author} />
        <Text as="span" role="hint">
          {meta.join(" · ")}
        </Text>
        {replyTo !== undefined ? (
          <Button
            variant="ghost"
            ariaLabel={`${messages.board.post.replyToAria} ${replyIdentity.username}`}
            onClick={jumpToParent}
          >
            {REPLY_MARKER_GLYPH}
            <MemberAvatar person={replyTo} size="sm" />
            {replyTo.excerpt === undefined
              ? replyIdentity.username
              : `${replyIdentity.username}: "${replyTo.excerpt}"`}
          </Button>
        ) : null}
        {!deleted && !editing && (!hidden || canSeeHidden) ? (
          <>
            {!hidden ? (
              <VoteButton
                votes={post.votes + (voted ? 1 : 0)}
                voted={voted}
                onToggle={onToggleVote}
              />
            ) : null}
            {canReply ? (
              <TextAction bracketed onClick={onReply}>
                {messages.board.post.reply}
              </TextAction>
            ) : null}
            <ModerationTargetControls target={target} mode="action" bracketed />
            {canEdit ? (
              <>
                <TextAction bracketed onClick={startEdit}>
                  {messages.board.post.edit}
                </TextAction>
                <TextAction bracketed onClick={askDelete}>
                  {messages.board.post.delete}
                </TextAction>
              </>
            ) : null}
          </>
        ) : null}
        {!deleted && hidden && !canSeeHidden ? (
          <ModerationTargetControls target={target} mode="action" bracketed />
        ) : null}
      </Stack>
      {content}
      {!deleted && hidden && canSeeHidden ? (
        <ModerationTargetControls target={target} mode="status" />
      ) : null}
    </Stack>
  );
}
