"use client";

import { useState } from "react";
import { Button, Field, Form, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellDialogs } from "@/features/shell";
import { fromLocalInput, toLocalInput } from "./datetime";
import type { Readroom } from "./readrooms";
import { moveDeadline, stopReadroom } from "./readroom-store";

export type ReadroomLeadControlsProps = {
  readroom: Readroom;
};

function StopConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Stack gap={8}>
      <Text as="div">{messages.readroom.lead.stopText}</Text>
      <Text as="div" role="hint">
        {messages.readroom.lead.stopHint}
      </Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="danger" onClick={onConfirm}>
          {messages.readroom.lead.stopConfirm}
        </Button>
        <Button onClick={onCancel}>{messages.readroom.lead.cancel}</Button>
      </Stack>
    </Stack>
  );
}

/** The lead's cycle controls while the task is open (collecting or
 * reviewing): move the deadline, or stop the cycle with an archive and no
 * write-up (READROOM.md §7). */
export function ReadroomLeadControls({ readroom }: ReadroomLeadControlsProps) {
  const dialogs = useShellDialogs();
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();

  function save() {
    const iso = fromLocalInput(draft);
    if (iso === null || Date.parse(iso) <= Date.now()) {
      setError(messages.readroom.lead.badDeadline);
      return;
    }
    setError(undefined);
    setMoving(false);
    moveDeadline(readroom.id, iso);
  }

  function cancel() {
    setError(undefined);
    setMoving(false);
  }

  function askStop() {
    dialogs.open({
      title: messages.readroom.lead.stopTitle,
      body: (
        <StopConfirm
          onConfirm={() => {
            dialogs.close();
            stopReadroom(readroom.id);
          }}
          onCancel={dialogs.close}
        />
      ),
    });
  }

  if (moving) {
    return (
      <Form onSubmit={save} onCancel={cancel} ariaLabel={messages.readroom.lead.moveLabel}>
        <Stack gap={6}>
          <Field
            label={messages.readroom.lead.deadlineLabel}
            name={`deadline-${readroom.id}`}
            type="datetime-local"
            value={draft}
            onChange={setDraft}
            required
            error={error}
          />
          <Stack direction="row" gap={6} navRow>
            <Button type="submit" variant="primary">
              {messages.readroom.lead.save}
            </Button>
            <Button onClick={cancel}>{messages.readroom.lead.cancel}</Button>
          </Stack>
        </Stack>
      </Form>
    );
  }

  return (
    <Stack direction="row" gap={6} wrap navRow>
      <Button
        variant="ghost"
        onClick={() => {
          setDraft(toLocalInput(readroom.deadlineAt));
          setError(undefined);
          setMoving(true);
        }}
      >
        {messages.readroom.lead.move}
      </Button>
      <Button variant="ghost" onClick={askStop}>
        {messages.readroom.lead.stop}
      </Button>
    </Stack>
  );
}
