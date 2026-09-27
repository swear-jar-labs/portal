"use client";

import { useState } from "react";
import { Button, Heading, Link, Stack, Text, Textarea } from "@swearjar/dos";
import { DOS_SURFACE_ATTR } from "@swearjar/dos/contracts";
import { messages } from "@/content/messages";
import { formatTimestamp } from "@/lib/format";
import { Markdown } from "@/shared/Markdown/Markdown";
import { useOverlayPush, useShellDialogs, useShellSession } from "@/features/shell";
import { canReopenReview, targetKey, type ModerationAction, type ModerationReport } from "./model";
import { ModerationResolveForm } from "./ModerationResolveForm";
import { decideReport } from "./store";
import { useModeration } from "./useModeration";
import { useModerationPreview } from "./PreviewContext";
import styles from "./moderation.module.css";

const copy = messages.moderation;
const NOTE_ROWS = 3;
const TARGET_LINK_PREFIX = "moderation-target-";

function Review({
  report,
  hiddenReason,
  unavailable,
}: {
  report: ModerationReport;
  hiddenReason?: string;
  unavailable: boolean;
}) {
  const actor = useShellSession();
  const dialogs = useShellDialogs();
  const pushOverlay = useOverlayPush();
  const openPreview = useModerationPreview();
  const targetLinkId = `${TARGET_LINK_PREFIX}${report.id}`;
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const hidden = hiddenReason !== undefined;

  function act(action: Exclude<ModerationAction, "resolve">) {
    const result = decideReport(actor, report.id, report.version, action, note);
    if (!result.ok) {
      setError(copy.errors[result.error]);
      return;
    }
    setError("");
    if (action === "request-edit" || action === "hide") setNote("");
  }

  function openResolve() {
    dialogs.open({
      title: copy.resolveHeading,
      body: (
        <ModerationResolveForm
          actor={actor}
          report={report}
          hidden={hidden}
          unavailable={unavailable}
          initialNote={note}
          onResolved={() => {
            setNote("");
            dialogs.close();
          }}
          onCancel={dialogs.close}
        />
      ),
    });
  }

  return (
    <section
      aria-label={`${copy.caseLabel} ${report.target.label}`}
      className={styles.application}
      {...{ [DOS_SURFACE_ATTR]: "light" }}
    >
      <Stack gap={8}>
        <Heading level={2}>{report.target.label}</Heading>
        <Text role="hint">{`${copy.kinds[report.target.kind]} · ${copy.statuses[report.status]} · ${formatTimestamp(report.createdAt)}`}</Text>
        <Text>{`${copy.author} ${report.target.author}`}</Text>
        <Heading level={3}>{copy.complaintsHeading}</Heading>
        {report.complaints.map((complaint) => (
          <div className={styles.messageBlock} key={complaint.id}>
            <Stack gap={4}>
              <Text role="hint">{`${copy.from} ${complaint.reporter} · ${formatTimestamp(complaint.createdAt)} · ${copy.reportPrivate}`}</Text>
              <Text>{complaint.reason}</Text>
              {complaint.outcome ? (
                <Text role="hint">{`${copy.complaintOutcome}: ${copy.outcomes[complaint.outcome]}`}</Text>
              ) : null}
            </Stack>
          </div>
        ))}
        <Heading level={3}>{copy.historyHeading}</Heading>
        {report.events
          .filter((entry) => entry.kind !== "reported" && entry.kind !== "case-opened")
          .map((entry) => (
            <div className={styles.messageBlock} key={entry.id}>
              <Stack gap={4}>
                <Text role="hint">{`${copy.eventKinds[entry.kind]} · ${entry.actor} · ${formatTimestamp(entry.at)}`}</Text>
                {entry.body ? <Text>{entry.body}</Text> : null}
                {entry.revision ? (
                  <Text role="hint">{`${copy.currentRevision} ${entry.revision}`}</Text>
                ) : null}
              </Stack>
            </div>
          ))}
        {report.submittedRevision ? (
          <Text role="hint">{`${copy.submittedRevision} ${report.submittedRevision} · ${copy.currentRevision} ${report.currentRevision}`}</Text>
        ) : null}
        {report.submittedBody !== undefined ? (
          <div className={styles.messageBlock}>
            <Markdown>{report.submittedBody}</Markdown>
          </div>
        ) : null}
        {report.currentRevision !== report.submittedRevision && report.currentBody !== undefined ? (
          <div className={styles.messageBlock}>
            <Text role="hint">{copy.currentRevision}</Text>
            <Markdown>{report.currentBody}</Markdown>
          </div>
        ) : null}
        {report.submittedRevision && report.submittedRevision !== report.currentRevision ? (
          <Text role="danger">{copy.staleCorrection}</Text>
        ) : null}
        {report.correctionSubmittedAt ? (
          <Text role="positive">{`${copy.adminCorrectionSent} · ${formatTimestamp(report.correctionSubmittedAt)}`}</Text>
        ) : null}
        {hidden ? (
          <Text role="danger">
            {report.status === "resolved" ? copy.permanentHidden : copy.hidden}
          </Text>
        ) : null}
        {unavailable ? (
          <Text role="danger">{copy.errors.missing}</Text>
        ) : report.target.localBody !== undefined ? (
          <Button
            id={targetLinkId}
            variant="ghost"
            onClick={() => openPreview(report.id, targetLinkId)}
          >
            {copy.openTarget}
          </Button>
        ) : (
          <Link
            id={targetLinkId}
            href={report.target.href}
            underline
            onClick={pushOverlay(report.target.href, targetLinkId)}
          >
            {copy.openTarget}
          </Link>
        )}
        {report.status !== "resolved" && !unavailable ? (
          <>
            <Textarea
              label={copy.draftModeratorMessage}
              name={`moderation-note-${report.id}`}
              value={note}
              onChange={setNote}
              rows={NOTE_ROWS}
            />
            <Text role="hint">{copy.draftMessageHint}</Text>
          </>
        ) : null}
        {error ? <Text role="danger">{error}</Text> : null}
        {report.status !== "resolved" ? (
          <Stack direction="row" gap={8} wrap>
            {report.status === "received" && !unavailable ? (
              <Button onClick={() => act("review")}>{copy.actions.review}</Button>
            ) : null}
            {!unavailable ? (
              <>
                <Button onClick={() => act("request-edit")}>{copy.actions.requestEdit}</Button>
              </>
            ) : null}
            <Button onClick={openResolve}>{copy.actions.resolve}</Button>
            {unavailable ? null : hidden ? (
              <Button onClick={() => act("restore")}>{copy.actions.restore}</Button>
            ) : (
              <Button variant="danger" onClick={() => act("hide")}>
                {copy.actions.hide}
              </Button>
            )}
          </Stack>
        ) : null}
        {canReopenReview(report, hidden) && !unavailable ? (
          <Stack direction="row">
            <Button onClick={() => act("review")}>{copy.actions.reopenReview}</Button>
          </Stack>
        ) : null}
      </Stack>
    </section>
  );
}

export function ModerationQueue() {
  const actor = useShellSession();
  const state = useModeration();
  if (!actor?.admin) return <Text role="danger">{copy.denied}</Text>;
  const ordered = [...state.reports].sort((a, b) => {
    const active = Number(b.status !== "resolved") - Number(a.status !== "resolved");
    return active || b.createdAt.localeCompare(a.createdAt);
  });
  return (
    <Stack gap={12}>
      <Heading level={1}>{copy.heading}</Heading>
      <Text>{copy.intro}</Text>
      {ordered.length === 0 ? <Text role="hint">{copy.empty}</Text> : null}
      {ordered.map((report) => (
        <Review
          key={report.id}
          report={report}
          hiddenReason={state.hidden[targetKey(report.target)]?.note}
          unavailable={state.unavailable.has(targetKey(report.target))}
        />
      ))}
    </Stack>
  );
}
