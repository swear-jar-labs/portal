"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Stack, Text, Textarea } from "@swearjar/dos";
import { DOS_SURFACE_ATTR } from "@swearjar/dos/contracts";
import { messages } from "@/content/messages";
import type { MemberApplication } from "@/features/account/contracts";
import styles from "./AdminQueue.module.css";

const copy = messages.admin;
const DECISION_ROWS = 3;

type ReviewItem = { application: MemberApplication; history: ReactNode };
type DecideAction = (
  input: unknown,
) => Promise<{ ok: true } | { ok: false; error: keyof typeof messages.account.apply.actionErrors }>;

function ApplicationReview({
  application,
  history,
  onDecide,
}: ReviewItem & { onDecide: DecideAction }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submittedAt =
    application.history[0]?.at ?? messages.account.apply.statuses[application.status];

  function decide(decision: "clarification-requested" | "approved" | "rejected") {
    if (decision !== "approved" && !note.trim()) {
      setError(copy.reasonRequired);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await onDecide({
        id: application.id,
        version: application.version,
        decision,
        note,
      });
      if (!result.ok) {
        setError(messages.account.apply.actionErrors[result.error]);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <section
      aria-label={`${application.user} ${submittedAt}`}
      className={styles.application}
      {...{ [DOS_SURFACE_ATTR]: "light" }}
    >
      <Stack gap={8}>
        <Heading level={2}>{application.user}</Heading>
        {history}
        {application.status === "pending" ? (
          <Stack gap={8}>
            <Textarea
              label={copy.reason}
              name={`reason-${application.id}`}
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
            {application.status === "needs-info" ? copy.awaiting : copy.closed}
          </Text>
        )}
        {error ? <Text role="danger">{error}</Text> : null}
      </Stack>
    </section>
  );
}

export function AdminQueue({ items, onDecide }: { items: ReviewItem[]; onDecide: DecideAction }) {
  const ordered = [...items].sort(
    (left, right) =>
      Number(right.application.status === "pending") -
      Number(left.application.status === "pending"),
  );
  return (
    <Stack gap={12}>
      <Heading level={1}>{copy.heading}</Heading>
      <Text>{copy.intro}</Text>
      {ordered.length === 0 ? <Text role="hint">{copy.empty}</Text> : null}
      {ordered.map((item) => (
        <ApplicationReview key={item.application.id} {...item} onDecide={onDecide} />
      ))}
    </Stack>
  );
}
