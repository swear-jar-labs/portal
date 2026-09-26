"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Heading, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { VoteButton } from "@/features/board/contracts";
import { useMergedTickets, type Ticket } from "@/features/tickets/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import {
  formatDeadlineDate,
  hasNoteBy,
  hasUpvoted,
  isLead,
  phaseOf,
  READROOM_CARD_ATTR,
  visibleNotes,
  type Readroom,
  type ReadroomAttachment,
} from "../model/readrooms";
import {
  addAttachments,
  deleteNote,
  editNote,
  readroomStateOf,
  removeAttachment,
  sessionReadroom,
  toggleReadroomUpvote,
} from "../data/readroom-store";
import { attachmentsFromFiles, releaseAttachments } from "../data/attachments";
import { useReadroomStore } from "../data/useReadroomSession";
import { ReadroomFilesRow } from "./ReadroomFilesRow";
import { ReadroomTicketRow } from "./ReadroomTicketRow";
import { ReadroomLeadControls } from "./ReadroomLeadControls";
import { ReadroomNoteItem } from "./ReadroomNoteItem";
import { ReadroomReportForm } from "./ReadroomReportForm";
import { NoteForm } from "./NoteForm";
import styles from "../readroom.module.css";

export type ReadroomViewProps = {
  readroom: Readroom;
  now: string;
  // The ticket queue for the linked-ticket row: fixtures, merged with the
  // session's tickets below.
  tickets: readonly Ticket[];
  // The description body, rendered in RSC for a routed task and on the client
  // for a session-composed one.
  description: ReactNode;
  // Markdown bodies of the fixture notes, rendered in RSC and keyed by note id;
  // session notes and edits render through the same pipeline on the client.
  noteBodies: Record<string, ReactNode>;
  // The fixture's report body, rendered in RSC; a published session write-up
  // renders on the client instead.
  report?: ReactNode;
};

/** The task's interactive half: the dates, the lead's controls, the notes with
 * their phase gates (READROOM.md §5) and the write-up. The session store
 * overlays the fixture facts; the RSC-rendered bodies stay with the fixtures. */
export function ReadroomView({
  readroom,
  tickets,
  now,
  description,
  noteBodies,
  report,
}: ReadroomViewProps) {
  const state = useReadroomStore();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  // The phase reads off the page-open stamp: a deadline passing on an open
  // screen applies on the next navigation, not mid-read.
  const effective = sessionReadroom(readroom, state);
  const task = readroomStateOf(state, readroom.id);
  const phase = phaseOf(effective, now);
  const { notes, sealed } = visibleNotes(effective, now, session?.user ?? null);
  const lead = isLead(effective, session?.user ?? null);
  const posted = hasNoteBy(effective.notes, session?.user ?? null);
  const allTickets = useMergedTickets(tickets);
  const filesEditable = lead && (phase === "collecting" || phase === "reviewing");
  // A deleted note reopens the form: the caret follows it there.
  const noteFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const returnToNoteForm = useRef(false);

  useEffect(() => {
    if (posted || !returnToNoteForm.current) return;
    returnToNoteForm.current = false;
    noteFieldRef.current?.focus();
  }, [posted]);
  const reportNode =
    report !== undefined && effective.report === readroom.report ? (
      report
    ) : effective.report === undefined ? undefined : (
      <Markdown>{effective.report}</Markdown>
    );

  function addFiles(files: FileList) {
    addAttachments(readroom.id, attachmentsFromFiles(files));
  }

  function removeFile(attachment: ReadroomAttachment) {
    releaseAttachments([attachment]);
    removeAttachment(readroom.id, attachment.id);
  }

  // One upvote per account with a withdrawal, Participant and Member alike; a
  // guest meets the logon prompt instead (the board's vote gate).
  function toggleVote() {
    if (session === null) {
      requestLogin();
      return;
    }
    toggleReadroomUpvote(effective.id, session.user, effective.upvotes);
  }

  return (
    <Stack gap={12}>
      <ReadroomFilesRow
        attachments={task.attachments}
        editable={filesEditable}
        onAdd={addFiles}
        onRemove={removeFile}
      />
      <ReadroomTicketRow ticket={effective.ticket} tickets={allTickets} />

      <Stack gap={4}>
        <Text role="hint">
          {`${messages.readroom.task.deadline} ${formatDeadlineDate(effective.deadlineAt)}`}
        </Text>
        {phase === "published" && effective.reportAt !== undefined ? (
          <Text role="hint">
            {`${messages.readroom.phases.published} ${formatDeadlineDate(effective.reportAt)}`}
          </Text>
        ) : null}
        {phase === "archived" && effective.archivedAt !== undefined ? (
          <Text role="hint">
            {`${messages.readroom.phases.archived} ${formatDeadlineDate(effective.archivedAt)}`}
          </Text>
        ) : null}
        {lead && (phase === "collecting" || phase === "reviewing") ? (
          <ReadroomLeadControls readroom={effective} />
        ) : null}
      </Stack>

      <Stack direction="row" gap={6} navRow>
        <VoteButton
          votes={effective.upvotes.length}
          voted={hasUpvoted(effective.upvotes, session?.user ?? null)}
          onToggle={toggleVote}
        />
      </Stack>

      <div className={styles.task} {...{ [READROOM_CARD_ATTR]: "" }}>
        {description}
      </div>

      <Stack gap={6}>
        <Heading level={2}>{messages.readroom.notes.heading}</Heading>

        {notes.length === 0 ? (
          sealed === 0 ? (
            <Text role="hint">{messages.readroom.notes.empty}</Text>
          ) : null
        ) : (
          notes.map((note) => (
            <ReadroomNoteItem
              key={note.id}
              note={note}
              now={now}
              body={noteBodies[note.id]}
              editedBody={task.noteEdits.get(note.id)}
              own={session?.user === note.author.user}
              canEdit={session?.user === note.author.user && phase === "collecting"}
              onEdit={(body) => editNote(readroom.id, note.id, body)}
              onDelete={() => {
                returnToNoteForm.current = true;
                deleteNote(readroom.id, note.id);
              }}
            />
          ))
        )}

        {sealed > 0 ? (
          <Text role="hint">
            {`${formatCount(sealed, pluralForms.note)} ${messages.readroom.notes.sealed}`}
          </Text>
        ) : null}

        {phase === "collecting" ? (
          posted ? (
            <Text role="hint">{messages.readroom.notes.posted}</Text>
          ) : (
            <NoteForm readroomId={readroom.id} fieldRef={noteFieldRef} />
          )
        ) : null}
      </Stack>

      {effective.report === undefined ? (
        phase === "reviewing" ? (
          lead ? (
            <ReadroomReportForm readroomId={readroom.id} />
          ) : (
            <Text role="hint">{messages.readroom.report.inProgress}</Text>
          )
        ) : phase === "archived" ? (
          <Text role="hint">{messages.readroom.report.stopped}</Text>
        ) : null
      ) : (
        <Stack gap={6}>
          <Heading level={2}>{messages.readroom.report.heading}</Heading>
          <div className={styles.report} {...{ [READROOM_CARD_ATTR]: "" }}>
            {reportNode}
          </div>
        </Stack>
      )}
    </Stack>
  );
}
