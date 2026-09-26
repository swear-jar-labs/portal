"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { MemberAvatar, useMemberIdentity } from "@/shared/MemberIdentity";
import { replySchema } from "../model/schema";
import type { ReplyTarget } from "../data/thread-actions";

const REPLY_ROWS = 2;
const CLEAR_TARGET_GLYPH = "[×]";

export type ReplyFormProps = {
  onReply: (body: string, replyTo?: string) => void;
  // The post the reply will answer; absent means the thread's tail.
  target?: ReplyTarget;
  onTargetChange: (targetId: string | undefined) => void;
};

/** The thread's inline reply composer: rows of the post walk (the target chip
 * has one of its own above the editor rows), so ▲/▼ leave the post list
 * naturally. */
export function ReplyForm({ onReply, target, onTargetChange }: ReplyFormProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const targetIdentity = useMemberIdentity(target ?? { user: "" });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // The target changes hand the caret to the field: choosing, switching or
  // clearing one moves the keyboard there (and the view follows — the composer
  // is the thread's tail). The first mount is not a change: opening a thread
  // must leave the view at its head.
  const focusedTarget = useRef(target?.id);
  useEffect(() => {
    if (focusedTarget.current === target?.id) return;
    focusedTarget.current = target?.id;
    fieldRef.current?.focus();
  }, [target?.id]);

  function handleSubmit() {
    const parsed = replySchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.board.reply.error);
      return;
    }
    // A guest keeps the draft and the target: the prompt takes over.
    if (session === null) {
      requestLogin();
      return;
    }
    setError(undefined);
    setDraft("");
    onReply(parsed.data.body, target?.id);
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.board.reply.formLabel}>
      <Stack gap={6} navRow>
        {target ? (
          // The chip is a walk row of its own above the editor: ▲ from the
          // field climbs the toolbar and the tabs before its clear control.
          <Stack direction="row" gap={6} align="center" wrap navRow>
            <Text as="span" role="hint">
              {messages.board.reply.target}
            </Text>
            <MemberAvatar person={target} size="sm" />
            <Text as="span">
              {target.excerpt === undefined
                ? targetIdentity.username
                : `${targetIdentity.username}: "${target.excerpt}"`}
            </Text>
            <Button
              variant="ghost"
              ariaLabel={messages.board.reply.cancelTarget}
              onClick={() => onTargetChange(undefined)}
            >
              {CLEAR_TARGET_GLYPH}
            </Button>
          </Stack>
        ) : null}
        <MarkdownEditor
          ref={fieldRef}
          label={messages.board.reply.label}
          name="reply"
          value={draft}
          onChange={setDraft}
          rows={REPLY_ROWS}
          error={error}
        />
        <Stack direction="row" gap={6}>
          <Button type="submit" variant="primary">
            {messages.board.reply.submit}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
