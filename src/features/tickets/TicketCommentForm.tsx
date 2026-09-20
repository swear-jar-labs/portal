"use client";

import { useState } from "react";
import { Button, Form, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { avatarFor } from "@/shared/members";
import { ticketCommentSchema } from "./schema";
import * as ticketStore from "./ticket-store";

const COMMENT_ROWS = 3;

/** The dossier's comment composer: a guest keeps the draft and gets the login
 * prompt (the board's reply pattern). */
export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const parsed = ticketCommentSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.tickets.dossier.comments.error);
      return;
    }
    if (session === null) {
      requestLogin();
      return;
    }
    ticketStore.addTicketComment(ticketId, {
      author: { user: session.user, avatar: avatarFor(session.user) },
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
    });
    setDraft("");
    setError(undefined);
  }

  return (
    <Form onSubmit={submit} ariaLabel={messages.tickets.dossier.comments.label}>
      <Stack gap={6} navRow>
        <MarkdownEditor
          label={messages.tickets.dossier.comments.label}
          name="comment"
          value={draft}
          onChange={setDraft}
          rows={COMMENT_ROWS}
          error={error}
        />
        <Stack direction="row" gap={6}>
          <Button type="submit" variant="primary">
            {messages.tickets.dossier.comments.submit}
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
}
