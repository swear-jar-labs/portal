"use client";

import { useState } from "react";
import { Button, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { avatarFor } from "@/shared/members";
import { freshTicketAccess } from "./mock-ticket-access";
import { ticketCommentSchema } from "./schema";
import * as ticketStore from "./ticket-store";
import type { Ticket } from "./tickets";
import { canWriteTicket, isProjectManager, type TicketProject } from "./workflow";

const COMMENT_ROWS = 3;

/** The dossier's comment composer: a guest keeps the draft and gets the login
 * prompt (the board's reply pattern). */
export function TicketCommentForm({ ticket, project }: { ticket: Ticket; project: TicketProject }) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    const parsed = ticketCommentSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.tickets.dossier.comments.error);
      return;
    }
    if (session === null) {
      requestLogin();
      return;
    }
    const access = await freshTicketAccess(project.slug);
    if (
      !access ||
      access.actor?.user !== session.user ||
      !canWriteTicket(access.actor, access.project)
    ) {
      setError(messages.tickets.dossier.comments.memberRequired);
      return;
    }
    ticketStore.addTicketComment(
      ticket.id,
      {
        author: { user: session.user, avatar: avatarFor(session.user) },
        body: parsed.data.body,
        createdAt: new Date().toISOString(),
      },
      session.user === ticket.assignee?.user ||
        session.user === ticket.author.user ||
        isProjectManager(access.actor, access.project) ||
        (access.project.reviewers ?? []).some((person) => person.user === session.user),
    );
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
        {error === messages.tickets.dossier.comments.memberRequired ? (
          <Text role="danger">{error}</Text>
        ) : null}
      </Stack>
    </Form>
  );
}
