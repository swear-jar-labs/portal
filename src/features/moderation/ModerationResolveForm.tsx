"use client";

import { useState } from "react";
import { Button, Form, Select, Stack, Text, Textarea, type SelectOption } from "@swearjar/dos";
import { REPORTS_PATH } from "@/content/commands";
import { messages } from "@/content/messages";
import { buildModerationDecisionEvents, enqueueInboxEvent } from "@/features/inbox/contracts";
import type { ModerationReport, ResolutionOutcome } from "./model";
import { decideReport, type ModerationActor } from "./store";

const copy = messages.moderation;
const NOTE_ROWS = 4;
const outcomes: readonly ResolutionOutcome[] = [
  "corrected",
  "no-violation",
  "remain-hidden",
  "deleted",
];

export function ModerationResolveForm({
  actor,
  report,
  hidden,
  unavailable,
  initialNote,
  onResolved,
  onCancel,
}: {
  actor: ModerationActor;
  report: ModerationReport;
  hidden: boolean;
  unavailable: boolean;
  initialNote: string;
  onResolved: () => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [outcome, setOutcome] = useState<ResolutionOutcome | "">("");
  const [individualOutcomes, setIndividualOutcomes] = useState<
    Partial<Record<string, ResolutionOutcome>>
  >({});
  const [showIndividual, setShowIndividual] = useState(false);
  const [error, setError] = useState("");
  const activeComplaints = report.complaints.filter(
    (complaint) => complaint.round === report.round,
  );
  const validOutcomes = outcomes.filter((value) =>
    value === "deleted"
      ? unavailable
      : value === "remain-hidden"
        ? hidden
        : value === "corrected"
          ? report.submittedRevision !== undefined &&
            report.submittedRevision === report.currentRevision
          : !unavailable,
  );
  const selectedOutcome = unavailable
    ? "deleted"
    : outcome !== "" && validOutcomes.includes(outcome)
      ? outcome
      : "";
  const outcomeOptions: SelectOption<ResolutionOutcome | "">[] = [
    { value: "", label: copy.chooseOutcome },
    ...validOutcomes.map((value) => ({ value, label: copy.outcomes[value] })),
  ];
  const individualValidOutcomes = validOutcomes.filter((value) =>
    value === "remain-hidden"
      ? selectedOutcome === "remain-hidden"
      : value === "deleted"
        ? selectedOutcome === "deleted"
        : true,
  );
  const individualOptions: SelectOption<ResolutionOutcome | "">[] = [
    { value: "", label: copy.sameAsCase },
    ...individualValidOutcomes.map((value) => ({ value, label: copy.outcomes[value] })),
  ];

  function submit() {
    if (!selectedOutcome) {
      setError(copy.chooseOutcome);
      return;
    }
    if (!note.trim()) {
      setError(copy.resolveNoteRequired);
      return;
    }
    const result = decideReport(
      actor,
      report.id,
      report.version,
      "resolve",
      note,
      selectedOutcome,
      individualOutcomes,
    );
    if (!result.ok) {
      setError(copy.errors[result.error]);
      return;
    }
    // The saved resolution notifies like any other ruling (see the queue).
    if (actor !== null) {
      for (const delivery of buildModerationDecisionEvents({
        reportId: report.id,
        outcome: selectedOutcome,
        actorUser: actor.user,
        actorName: actor.user,
        reporters: report.complaints.map((complaint) => complaint.reporter),
        targetAuthor: report.target.author,
        targetLabel: report.target.label,
        target: { kind: "report", label: report.target.label, href: REPORTS_PATH },
        at: new Date().toISOString(),
      }))
        enqueueInboxEvent(delivery.user, delivery.event);
    }
    onResolved();
  }

  return (
    <Form onSubmit={submit} onCancel={onCancel} ariaLabel={copy.resolveHeading}>
      <Stack gap={8}>
        <Text>{`${copy.kinds[report.target.kind]} · ${report.target.label}`}</Text>
        <Text role="hint">{copy.resolveHint}</Text>
        <Select
          label={copy.outcomeLabel}
          name={`moderation-outcome-${report.id}`}
          value={selectedOutcome}
          onChange={(value) => {
            setOutcome(value);
            setIndividualOutcomes({});
            setShowIndividual(false);
          }}
          options={outcomeOptions}
          autoFocus
        />
        <Text role="hint">{copy.outcomeHint}</Text>
        {activeComplaints.length > 1 && !unavailable ? (
          <Stack gap={8}>
            <Stack direction="row">
              <Button
                disabled={!selectedOutcome}
                onClick={() => {
                  if (showIndividual) setIndividualOutcomes({});
                  setShowIndividual(!showIndividual);
                }}
              >
                {showIndividual ? copy.hideIndividualOutcomes : copy.individualOutcomes}
              </Button>
            </Stack>
            {showIndividual ? (
              <Stack gap={8}>
                <Text role="hint">{copy.individualOutcomeHint}</Text>
                {activeComplaints.map((complaint) => (
                  <Select
                    key={complaint.id}
                    label={`${copy.individualOutcome} · ${copy.from} ${complaint.reporter}`}
                    name={`moderation-complaint-outcome-${complaint.id}`}
                    value={individualOutcomes[complaint.id] ?? ""}
                    onChange={(value) =>
                      setIndividualOutcomes((current) => ({
                        ...current,
                        [complaint.id]: value || undefined,
                      }))
                    }
                    options={individualOptions}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
        ) : null}
        <Textarea
          label={copy.resolutionNote}
          name={`moderation-resolution-note-${report.id}`}
          value={note}
          onChange={setNote}
          rows={NOTE_ROWS}
        />
        {error ? <Text role="danger">{error}</Text> : null}
        <Stack direction="row" gap={8} wrap>
          <Button type="submit" variant="primary">
            {copy.actions.resolve}
          </Button>
          <Button onClick={onCancel}>{copy.cancel}</Button>
        </Stack>
      </Stack>
    </Form>
  );
}
