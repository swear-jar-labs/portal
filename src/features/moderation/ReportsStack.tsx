"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  CloseButton,
  Heading,
  Link,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@swearjar/dos";
import { DOS_SURFACE_ATTR } from "@swearjar/dos/contracts";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { formatTimestamp } from "@/lib/format";
import {
  overlayLayerPanels,
  PanelStack,
  ShellPanel,
  useOverlayPush,
  useOverlayTop,
  useShellSession,
} from "@/features/shell";
import { contentReportsFor, sentReportsFor, targetKey, type ModerationReport } from "./model";
import { ModerationPreview } from "./ModerationPreview";
import {
  markAuthorReportSeen,
  markCorrected,
  markReporterReportSeen,
  requestReview,
  respondToRequest,
} from "./store";
import { useModeration } from "./useModeration";
import styles from "./moderation.module.css";

const copy = messages.moderation;
const tabs = [
  {
    value: "sent",
    label: copy.personal.sentTab,
    id: "reports-tab-sent",
    panelId: "reports-panel-sent",
  },
  {
    value: "content",
    label: copy.personal.contentTab,
    id: "reports-tab-content",
    panelId: "reports-panel-content",
  },
] as const;
type ReportsTab = (typeof tabs)[number]["value"];
const REPORT_ROW_PREFIX = "personal-report-";
const MATERIAL_LINK_ID = "personal-report-material";
const RESPONSE_ROWS = 4;

function ReportList({
  reports,
  tab,
  seenByAuthor,
  seenByReporter,
  user,
  onOpen,
}: {
  reports: readonly ModerationReport[];
  tab: ReportsTab;
  seenByAuthor: Readonly<Record<string, number>>;
  seenByReporter: Readonly<Record<string, number>>;
  user: string;
  onOpen: (id: string, tab: ReportsTab) => void;
}) {
  if (reports.length === 0)
    return (
      <Text role="hint">
        {tab === "sent" ? copy.personal.sentEmpty : copy.personal.contentEmpty}
      </Text>
    );
  return (
    <Stack gap={8}>
      {[...reports].reverse().map((report) => (
        <section
          key={report.id}
          aria-label={report.target.label}
          className={styles.application}
          {...{ [DOS_SURFACE_ATTR]: "light" }}
        >
          <Stack gap={8}>
            <Heading level={2}>{report.target.label}</Heading>
            <Text role="hint">{`${copy.kinds[report.target.kind]} · ${copy.caseLabel} ${copy.statuses[report.status]} · ${formatTimestamp(report.updatedAt)}`}</Text>
            {(
              tab === "content"
                ? (seenByAuthor[report.id] ?? 0) < report.events.length
                : (seenByReporter[`${user}:${report.id}`] ?? 0) < report.events.length
            ) ? (
              <Text role="accent">{copy.personal.new}</Text>
            ) : null}
            <Stack direction="row">
              <Button
                id={`${REPORT_ROW_PREFIX}${report.id}`}
                onClick={() => onOpen(report.id, tab)}
              >
                {copy.personal.openReport}
              </Button>
            </Stack>
          </Stack>
        </section>
      ))}
    </Stack>
  );
}

function ReportDetail({
  report,
  tab,
  hiddenReason,
  unavailable,
  onPreview,
}: {
  report: ModerationReport;
  tab: ReportsTab;
  hiddenReason?: string;
  unavailable: boolean;
  onPreview: () => void;
}) {
  const pushOverlay = useOverlayPush();
  const actor = useShellSession();
  const [actionError, setActionError] = useState("");
  const [response, setResponse] = useState("");

  function sendCorrection() {
    const result = markCorrected(actor, report.target);
    setActionError(result.ok ? "" : copy.errors[result.error]);
  }

  function sendResponse() {
    const result =
      report.status === "needs-edit" && !hiddenReason
        ? respondToRequest(actor, report.target, response)
        : requestReview(actor, report.target, response);
    setActionError(result.ok ? "" : copy.errors[result.error]);
    if (result.ok) setResponse("");
  }

  return (
    <Stack gap={8}>
      <Heading level={1}>{report.target.label}</Heading>
      <Text role="hint">{`${copy.kinds[report.target.kind]} · ${copy.caseLabel} ${copy.statuses[report.status]} · ${formatTimestamp(report.createdAt)}`}</Text>
      {tab === "sent" ? (
        <>
          <Heading level={2}>{copy.personal.privateReason}</Heading>
          <Text>{report.reason}</Text>
        </>
      ) : (
        <Text role="hint">{copy.personal.authorHint}</Text>
      )}
      {report.resolution ? (
        <Text role="positive">{`${copy.personal.resolution}: ${copy.outcomes[report.resolution]}`}</Text>
      ) : null}
      <Heading level={2}>{copy.historyHeading}</Heading>
      {report.events.map((entry) => (
        <div className={styles.messageBlock} key={entry.id}>
          <Stack gap={4}>
            <Text role="hint">{`${copy.eventKinds[entry.kind]} · ${formatTimestamp(entry.at)}`}</Text>
            {/* The sent tab already shows the reason as YOUR REASON above, so the
            reported event keeps only its header here to avoid a duplicate. */}
            {entry.body && !(tab === "sent" && entry.kind === "reported") ? (
              <Text>{entry.body}</Text>
            ) : null}
          </Stack>
        </div>
      ))}
      {report.events.length === 0 ? <Text role="hint">{copy.personal.noResponse}</Text> : null}
      {tab === "content" && hiddenReason ? (
        <>
          <Heading level={2}>{copy.personal.hiddenReason}</Heading>
          <Text>{hiddenReason}</Text>
        </>
      ) : null}
      {tab === "content" && report.status === "needs-edit" && !report.correctionReady ? (
        <Text>{copy.correctHint}</Text>
      ) : null}
      {tab === "content" && report.correctionReady ? (
        <Text>{copy.personal.readyToSend}</Text>
      ) : null}
      {tab === "content" && report.correctionSubmittedAt ? (
        <Text role="positive">{copy.correctionSent}</Text>
      ) : null}
      {unavailable ? (
        <Text role="danger">{copy.errors.missing}</Text>
      ) : report.target.localBody !== undefined ? (
        <Button id={MATERIAL_LINK_ID} onClick={onPreview}>
          {copy.openTarget}
        </Button>
      ) : (
        <Link
          id={MATERIAL_LINK_ID}
          href={report.target.href}
          underline
          onClick={pushOverlay(report.target.href, MATERIAL_LINK_ID)}
        >
          {copy.openTarget}
        </Link>
      )}
      {tab === "content" && report.correctionReady && !unavailable ? (
        <Stack direction="row">
          <Button onClick={sendCorrection}>{copy.sendCorrection}</Button>
        </Stack>
      ) : null}
      {tab === "content" &&
      !unavailable &&
      ((report.status === "needs-edit" && !report.reviewPending) || hiddenReason) ? (
        <Stack gap={8}>
          {report.reviewPending ? (
            <Text role="hint">{copy.personal.reviewPending}</Text>
          ) : (
            <>
              <Textarea
                label={copy.personal.responseLabel}
                name={`report-response-${report.id}`}
                value={response}
                onChange={setResponse}
                rows={RESPONSE_ROWS}
              />
              <Stack direction="row">
                <Button onClick={sendResponse}>
                  {hiddenReason
                    ? report.status === "resolved" && report.appealUsedRound === report.round
                      ? copy.personal.addInformation
                      : copy.personal.reviewRequest
                    : copy.personal.respond}
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      ) : null}
      {actionError ? <Text role="danger">{actionError}</Text> : null}
    </Stack>
  );
}

export function ReportsStack({ user }: { user: string }) {
  const state = useModeration();
  const [active, setActive] = useState<ReportsTab>("sent");
  const [selected, setSelected] = useState<{ id: string; tab: ReportsTab } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const closingRef = useRef(false);
  const returnFocus = useRef<string | null>(null);
  const previousPreview = useRef<string | null>(null);
  const { overlayLayers, closeOverlay } = useOverlayTop(closingRef);
  const sent = sentReportsFor(state, user);
  const content = contentReportsFor(state, user);
  const report = selected
    ? (selected.tab === "sent" ? sent : content).find((entry) => entry.id === selected.id)
    : undefined;

  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers, selected, previewId]);

  useEffect(() => {
    if (selected !== null || returnFocus.current === null) return;
    const id = returnFocus.current;
    returnFocus.current = null;
    document.getElementById(id)?.focus();
  }, [selected]);

  useEffect(() => {
    const previous = previousPreview.current;
    previousPreview.current = previewId;
    if (previous !== null && previewId === null) document.getElementById(MATERIAL_LINK_ID)?.focus();
  }, [previewId]);

  const open = useCallback(
    (id: string, tab: ReportsTab) => {
      returnFocus.current = `${REPORT_ROW_PREFIX}${id}`;
      if (tab === "content") markAuthorReportSeen(user, id);
      else markReporterReportSeen(user, id);
      setSelected({ id, tab });
    },
    [user],
  );

  const closeDetail = useCallback(() => setSelected(null), []);
  const closeTop = useCallback(() => {
    if (overlayLayers.length > 0) closeOverlay();
    else if (previewId !== null) setPreviewId(null);
    else closeDetail();
  }, [closeDetail, closeOverlay, overlayLayers.length, previewId]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("REPORTS")}>
        <Stack gap={12}>
          <Heading level={1}>{copy.personal.heading}</Heading>
          <SegmentedControl
            mode="tabs"
            label={copy.personal.tabsLabel}
            options={tabs}
            value={active}
            onChange={setActive}
          />
          <div
            id={tabs[0].panelId}
            role="tabpanel"
            aria-labelledby={tabs[0].id}
            hidden={active !== "sent"}
          >
            <ReportList
              reports={sent}
              tab="sent"
              seenByAuthor={state.seenByAuthor}
              seenByReporter={state.seenByReporter}
              user={user}
              onOpen={open}
            />
          </div>
          <div
            id={tabs[1].panelId}
            role="tabpanel"
            aria-labelledby={tabs[1].id}
            hidden={active !== "content"}
          >
            <ReportList
              reports={content}
              tab="content"
              seenByAuthor={state.seenByAuthor}
              seenByReporter={state.seenByReporter}
              user={user}
              onOpen={open}
            />
          </div>
        </Stack>
      </ShellPanel>
      {report && selected ? (
        <ShellPanel
          title={copy.personal.details}
          actions={<CloseButton onClose={closeDetail} label={messages.shell.window.closeLabel} />}
        >
          <ReportDetail
            report={report}
            tab={selected.tab}
            hiddenReason={state.hidden[targetKey(report.target)]?.note}
            unavailable={state.unavailable.has(targetKey(report.target))}
            onPreview={() => setPreviewId(report.sourceCaseId ?? report.id)}
          />
        </ShellPanel>
      ) : null}
      {previewId ? (
        <ShellPanel
          title={copy.previewHeading}
          actions={
            <CloseButton
              onClose={() => setPreviewId(null)}
              label={messages.shell.window.closeLabel}
            />
          }
        >
          <ModerationPreview reportId={previewId} />
        </ShellPanel>
      ) : null}
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
