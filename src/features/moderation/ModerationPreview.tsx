"use client";

import { useState } from "react";
import { Button, Heading, Stack, Text, Textarea } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";
import { Markdown } from "@/shared/Markdown/Markdown";
import { targetKey } from "./model";
import { markEdited } from "./store";
import { useModeration } from "./useModeration";

const EDIT_ROWS = 8;

/** A session-created parent has no route in the mock server. Its reported
 * material opens here as a live stack layer and follows author corrections. */
export function ModerationPreview({ reportId }: { reportId: string }) {
  const state = useModeration();
  const actor = useShellSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const report = state.reports.find((entry) => entry.id === reportId);
  if (!report || report.target.localBody === undefined)
    return <Text role="danger">{messages.moderation.errors.missing}</Text>;
  const body = report.currentBody ?? report.target.localBody;
  const key = targetKey(report.target);
  const unavailable = state.unavailable.has(key);
  const hidden = state.hidden[key];
  const canSeeHidden = actor?.admin || actor?.user === report.target.author;
  const editable = actor?.user === report.target.author && !unavailable;
  function save() {
    if (!report || !actor) return;
    const result = markEdited(actor, report.target, draft);
    setError(result.ok ? "" : messages.moderation.errors[result.error]);
    if (result.ok) setEditing(false);
  }
  return (
    <Stack gap={8}>
      <Heading level={1}>{report.target.label}</Heading>
      <Text role="hint">{messages.moderation.kinds[report.target.kind]}</Text>
      {unavailable ? (
        <Text role="danger">{messages.moderation.errors.missing}</Text>
      ) : hidden && !canSeeHidden ? (
        <Text role="hint">
          {hidden.permanent ? messages.moderation.permanentHidden : messages.moderation.hidden}
        </Text>
      ) : editing ? (
        <Stack gap={8}>
          <Textarea
            label={messages.moderation.personal.editMaterial}
            name={`moderation-edit-${report.id}`}
            value={draft}
            onChange={setDraft}
            rows={EDIT_ROWS}
          />
          <Stack direction="row" gap={8}>
            <Button onClick={save}>{messages.board.post.save}</Button>
            <Button onClick={() => setEditing(false)}>{messages.moderation.cancel}</Button>
          </Stack>
          {error ? <Text role="danger">{error}</Text> : null}
        </Stack>
      ) : (
        <>
          <Markdown>{body}</Markdown>
          {editable ? (
            <Stack direction="row">
              <Button
                onClick={() => {
                  setDraft(body);
                  setEditing(true);
                }}
              >
                {messages.moderation.personal.editMaterial}
              </Button>
            </Stack>
          ) : null}
        </>
      )}
    </Stack>
  );
}
