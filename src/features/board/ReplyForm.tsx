"use client";

import { useState } from "react";
import { Button, Form, Stack, Textarea } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { replySchema } from "./schema";

const REPLY_ROWS = 3;

export type ReplyFormProps = {
  onReply: (body: string) => void;
};

/** The thread's inline reply composer: a row of the post walk (textarea plus
 * the submit), so ▲/▼ leave the post list naturally. */
export function ReplyForm({ onReply }: ReplyFormProps) {
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
    // A guest keeps the draft: the prompt takes over, the text stays put.
    if (session === null) {
      requestLogin();
      return;
    }
    setError(undefined);
    setDraft("");
    onReply(parsed.data.body);
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.board.reply.formLabel}>
      <Stack gap={6} navRow>
        <Textarea
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
