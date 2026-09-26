"use client";

import { useState } from "react";
import { Button, Form, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MarkdownEditor } from "@/shared/MarkdownEditor/MarkdownEditor";
import { publishReport } from "../data/readroom-store";
import { reportSchema } from "../model/schema";

const REPORT_ROWS = 6;

export type ReadroomReportFormProps = {
  readroomId: string;
};

/** The lead's write-up composer: it appears in the reviewing phase and turns
 * the report fact into the published phase. */
export function ReadroomReportForm({ readroomId }: ReadroomReportFormProps) {
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
