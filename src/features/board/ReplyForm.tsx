"use client";

import { useState } from "react";
import { Avatar, Button, Form, Stack, Text, Textarea } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { replySchema } from "./schema";
import type { ReplyTarget } from "./thread-actions";

const REPLY_ROWS = 3;
const CLEAR_TARGET_GLYPH = "[×]";

export type ReplyFormProps = {
  onReply: (body: string, replyTo?: string) => void;
  // The post the reply will answer; absent means the thread's tail.
  target?: ReplyTarget;
  onTargetChange: (targetId: string | undefined) => void;
};

/** The thread's inline reply composer: rows of the post walk (the target chip
 * has one of its own, so ▲ from the field lands on its clear control), so ▲/▼
 * leave the post list naturally. */
export function ReplyForm({ onReply, target, onTargetChange }: ReplyFormProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

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
          // The chip is a walk row of its own: ▲ from the field climbs into it
          // and lands on the clear control.
          <Stack direction="row" gap={6} align="center" wrap navRow>
            <Text as="span" role="hint">
              {messages.board.reply.target}
            </Text>
            <Avatar user={target.user} src={target.avatar} size="sm" />
            <Text as="span">
              {target.excerpt === undefined ? target.user : `${target.user}: "${target.excerpt}"`}
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
        {/* Setting or clearing the target remounts the field, so the caret
            lands back in the text the moment the context changes. */}
        <Textarea
          key={target?.id ?? "none"}
          label={messages.board.reply.label}
          name="reply"
          value={draft}
          onChange={setDraft}
          rows={REPLY_ROWS}
          error={error}
          autoFocus
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
