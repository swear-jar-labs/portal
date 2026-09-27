"use client";

import { useState } from "react";
import { Button, Form, Stack, Text, Textarea } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellDialogs, useShellSession } from "@/features/shell";
import { TextAction } from "@/shared/TextAction/TextAction";
import { caseForTarget, targetKey, type ModerationTarget } from "./model";
import { markCorrected, requestReview, submitReport, type ModerationActor } from "./store";
import { useModeration } from "./useModeration";

const REASON_ROWS = 4;
const copy = messages.moderation;

function ReportForm({
  actor,
  target,
  close,
}: {
  actor: ModerationActor;
  target: ModerationTarget;
  close: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const result = submitReport(actor, target, reason);
    if (!result.ok) {
      setError(copy.errors[result.error]);
      return;
    }
    close();
  }

  return (
    <Form onSubmit={submit} onCancel={close} ariaLabel={copy.formHeading}>
      <Stack gap={8}>
        <Text>{copy.formHint}</Text>
        <Textarea
          label={copy.reason}
          name={`moderation-reason-${target.id}`}
          value={reason}
          onChange={setReason}
          rows={REASON_ROWS}
        />
        {error ? <Text role="danger">{error}</Text> : null}
        <Stack direction="row" gap={8} wrap>
          <Button type="submit" variant="primary">
            {copy.submit}
          </Button>
          <Button onClick={close}>{copy.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  );
}

function ReviewForm({
  actor,
  target,
  label,
  close,
}: {
  actor: ModerationActor;
  target: ModerationTarget;
  label: string;
  close: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  function submit() {
    const result = requestReview(actor, target, reason);
    if (!result.ok) {
      setError(copy.errors[result.error]);
      return;
    }
    close();
  }
  return (
    <Form onSubmit={submit} onCancel={close} ariaLabel={label}>
      <Stack gap={8}>
        <Textarea
          label={copy.personal.responseLabel}
          name={`moderation-review-${target.id}`}
          value={reason}
          onChange={setReason}
          rows={REASON_ROWS}
        />
        {error ? <Text role="danger">{error}</Text> : null}
        <Stack direction="row" gap={8}>
          <Button type="submit" variant="primary">
            {label}
          </Button>
          <Button onClick={close}>{copy.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  );
}

/** Material actions carry only the active reporter marker and public hiding. */
export function ModerationTargetControls({
  target,
  unavailable = false,
  mode,
  bracketed = false,
}: {
  target: ModerationTarget;
  unavailable?: boolean;
  mode: "action" | "status";
  bracketed?: boolean;
}) {
  const actor = useShellSession();
  const requestLogin = useLoginPrompt();
  const dialogs = useShellDialogs();
  const [actionError, setActionError] = useState("");
  const state = useModeration();
  const key = targetKey(target);
  const hidden = state.hidden[key];
  const report = caseForTarget(state, target);
  const isAuthor = actor?.user === target.author;
  const ownReport =
    report?.complaints.some(
      (entry) => entry.reporter === actor?.user && entry.round === report.round,
    ) ?? false;
  const active = report !== undefined && report.status !== "resolved";
  const correctionReady = isAuthor && active && report.correctionReady;
  const correctionSent = isAuthor && active && report.correctionSubmittedAt !== undefined;

  function openReport() {
    if (!actor) {
      requestLogin();
      return;
    }
    dialogs.open({
      title: copy.formHeading,
      body: <ReportForm actor={actor} target={target} close={dialogs.close} />,
    });
  }

  function openReview() {
    const label =
      report?.status === "resolved" && report.appealUsedRound === report.round
        ? copy.personal.addInformation
        : copy.appeal;
    dialogs.open({
      title: label,
      body: <ReviewForm actor={actor} target={target} label={label} close={dialogs.close} />,
    });
  }

  if (mode === "action") {
    const available = !unavailable && !state.unavailable.has(key);
    const statusLabel = correctionSent
      ? copy.correctionSent
      : active && (ownReport || isAuthor)
        ? copy.sent
        : null;
    return (
      <>
        {statusLabel ? (
          <Text as="span" role="hint">
            {statusLabel}
          </Text>
        ) : null}
        {available && correctionReady ? (
          <TextAction
            bracketed={bracketed}
            onClick={() => {
              const result = markCorrected(actor, target);
              setActionError(result.ok ? "" : copy.errors[result.error]);
            }}
          >
            {copy.sendCorrection}
          </TextAction>
        ) : null}
        {actionError ? (
          <Text as="span" role="danger">
            {actionError}
          </Text>
        ) : null}
        {available && !isAuthor && !ownReport ? (
          <TextAction bracketed={bracketed} onClick={openReport}>
            {report?.complaints.some((entry) => entry.reporter === actor?.user)
              ? copy.reportAgain
              : copy.report}
          </TextAction>
        ) : null}
        {available && hidden && isAuthor && !report?.reviewPending ? (
          <TextAction bracketed={bracketed} onClick={openReview}>
            {report?.status === "resolved" && report.appealUsedRound === report.round
              ? copy.personal.addInformation
              : copy.appeal}
          </TextAction>
        ) : null}
      </>
    );
  }

  return (
    <>
      {hidden ? (
        <Text role="danger">{hidden.permanent ? copy.permanentHidden : copy.hidden}</Text>
      ) : null}
    </>
  );
}
