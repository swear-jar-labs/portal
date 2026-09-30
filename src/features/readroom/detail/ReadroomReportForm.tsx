"use client";

import { useState } from "react";
import { Button, Form, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import {
  buildReadroomReportEvents,
  enqueueInboxEvent,
  useMentionNotifier,
} from "@/features/inbox/contracts";
import { useShellSession } from "@/features/shell";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { publishReport } from "../data/readroom-store";
import { readroomPath } from "../model/readrooms";
import { reportSchema } from "../model/schema";

const REPORT_ROWS = 6;

export type ReadroomReportFormProps = {
  readroomId: string;
  taskTitle: string;
  // Every note author on the task: the published write-up notifies them all.
  noteAuthors: readonly string[];
};

/** The lead's write-up composer: it appears in the reviewing phase and turns
 * the report fact into the published phase. */
export function ReadroomReportForm({
  readroomId,
  taskTitle,
  noteAuthors,
}: ReadroomReportFormProps) {
  const session = useShellSession();
  const notifyMentions = useMentionNotifier();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit() {
    const parsed = reportSchema.safeParse({ body: draft });
    if (!parsed.success) {
      setError(messages.readroom.report.form.error);
      return;
    }
    setError(undefined);
    publishReport(readroomId, parsed.data.body);
    // The write-up publishes openly: the notice may quote it.
    notifyMentions({
      authorUser: session?.user ?? null,
      messageId: `${readroomId}:report`,
      body: parsed.data.body,
      source: messages.readroom.feed.heading,
      context: taskTitle,
      target: { kind: "readroom", label: taskTitle, href: readroomPath(readroomId) },
    });
    // The report notifies every note author from the saved task: one stable
    // id, so republishing never re-delivers. The form renders for the lead
    // only, so the session is the publishing lead here.
    if (session !== null) {
      for (const delivery of buildReadroomReportEvents({
        readroomId,
        taskTitle,
        actorUser: session.user,
        actorName: session.user,
        noteAuthors,
        target: { kind: "readroom", label: taskTitle, href: readroomPath(readroomId) },
        at: new Date().toISOString(),
      }))
        enqueueInboxEvent(delivery.user, delivery.event);
    }
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.readroom.report.heading}>
      <Stack gap={6}>
        <Heading level={2}>{messages.readroom.report.heading}</Heading>
        <MarkdownEditor
          label={messages.readroom.report.form.label}
          name={`report-${readroomId}`}
          value={draft}
          onChange={setDraft}
          rows={REPORT_ROWS}
          error={error}
        />
        <Stack direction="row" gap={6} navRow>
          <Button type="submit" variant="primary">
            {messages.readroom.report.form.submit}
          </Button>
        </Stack>
        <Text role="hint">{messages.readroom.report.form.hint}</Text>
      </Stack>
    </Form>
  );
}
