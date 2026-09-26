"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text, Textarea } from "@swearjar/dos";
import { DOS_SURFACE_ATTR } from "@swearjar/dos/contracts";
import { messages } from "@/content/messages";
import { formatTimestamp } from "@/lib/format";
import { MemberName, useMemberIdentity } from "@/shared/MemberIdentity";
import type { ProjectSubmission } from "@/features/projects/contracts";
import styles from "./AdminQueue.module.css";

const copy = messages.admin;
const DECISION_ROWS = 3;
type DecideAction = (
  input: unknown,
) => Promise<{ ok: true } | { ok: false; error: keyof typeof messages.projects.proposal.errors }>;

function Review({
  submission,
  onDecide,
}: {
  submission: ProjectSubmission;
  onDecide: DecideAction;
}) {
  const router = useRouter();
  const identity = useMemberIdentity({ user: submission.user });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submittedAt = submission.history[0]
    ? formatTimestamp(submission.history[0].at)
    : messages.projects.proposal.none;

  function decide(decision: "clarification-requested" | "approved" | "rejected") {
    if (decision !== "approved" && !note.trim()) {
      setError(copy.reasonRequired);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await onDecide({
        id: submission.id,
        version: submission.version,
        decision,
        note,
      });
      if (!result.ok) {
        setError(messages.projects.proposal.errors[result.error]);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <section
      aria-label={`${submission.details.name} ${identity.username} ${submittedAt}`}
      className={styles.application}
      {...{ [DOS_SURFACE_ATTR]: "light" }}
    >
      <Stack gap={8}>
        <Heading level={2}>{submission.details.name}</Heading>
        <Text role="hint">{identity.username}</Text>
        <Stack gap={4}>
          <Heading level={3}>{messages.projects.proposal.history}</Heading>
          <Text role="accent">{messages.projects.proposal.states[submission.status]}</Text>
          <Text>
            {messages.projects.proposal.fields.slug}: {submission.details.slug}
          </Text>
          <Text>
            {messages.projects.proposal.fields.goal}: {submission.details.goal}
          </Text>
          <Text>
            {messages.projects.proposal.fields.repoUrl}:{" "}
            {submission.details.repoUrl || messages.projects.proposal.none}
          </Text>
          <Text>
            {messages.projects.proposal.fields.stack}:{" "}
            {submission.details.stack.map((tech) => messages.readroom.tags[tech]).join(", ")}
          </Text>
          <Text>
            {messages.projects.proposal.fields.contributors}: {submission.details.contributors}
          </Text>
          <ol>
            {submission.history.map((event, index) => (
              <li key={`${submission.id}-${index}`}>
                <Text>
                  {messages.projects.proposal.events[event.kind]} · <MemberName user={event.by} /> ·{" "}
                  {formatTimestamp(event.at)}
                </Text>
                {event.note ? <Text>{event.note}</Text> : null}
              </li>
            ))}
          </ol>
        </Stack>
        {submission.status === "pending" ? (
          <Stack gap={8}>
            <Textarea
              label={copy.reason}
              name={`project-reason-${submission.id}`}
              value={note}
              onChange={setNote}
              rows={DECISION_ROWS}
            />
            <Stack direction="row" gap={8} wrap>
              <Button onClick={() => decide("clarification-requested")} disabled={pending}>
                {copy.request}
              </Button>
              <Button onClick={() => decide("approved")} variant="primary" disabled={pending}>
                {copy.approve}
              </Button>
              <Button onClick={() => decide("rejected")} disabled={pending}>
                {copy.reject}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Text role="hint">
            {submission.status === "needs-info" ? copy.awaiting : copy.closed}
          </Text>
        )}
        {error ? <Text role="danger">{error}</Text> : null}
      </Stack>
    </section>
  );
}

export function ProjectAdminQueue({
  submissions,
  onDecide,
}: {
  submissions: ProjectSubmission[];
  onDecide: DecideAction;
}) {
  const ordered = [...submissions].sort(
    (a, b) => Number(b.status === "pending") - Number(a.status === "pending"),
  );
  return (
    <Stack gap={12}>
      <Heading level={1}>{copy.projects.heading}</Heading>
      <Text>{copy.projects.intro}</Text>
      {ordered.length === 0 ? <Text role="hint">{copy.projects.empty}</Text> : null}
      {ordered.map((submission) => (
        <Review key={submission.id} submission={submission} onDecide={onDecide} />
      ))}
    </Stack>
  );
}
