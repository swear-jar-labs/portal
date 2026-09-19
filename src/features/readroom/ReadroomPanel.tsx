import type { ReactNode } from "react";
import { Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { Markdown } from "@/shared/Markdown/Markdown";
import {
  formatDeadlineDate,
  phaseOf,
  READROOM_CARD_ATTR,
  ticketPath,
  type Readroom,
} from "./readrooms";
import { ReadroomView } from "./ReadroomView";
import styles from "./readroom.module.css";

export type ReadroomPanelProps = {
  readroom: Readroom;
  now: string;
};

/** The task's RSC half: the source block, the description and the notes/report
 * bodies rendered through the Markdown pipeline — the client view receives
 * prepared nodes, so the pipeline never ships to the client. */
export function ReadroomPanel({ readroom, now }: ReadroomPanelProps) {
  const noteBodies: Record<string, ReactNode> = {};
  for (const note of readroom.notes) {
    noteBodies[note.id] = <Markdown>{note.body}</Markdown>;
  }
  const report = readroom.report === undefined ? undefined : <Markdown>{readroom.report}</Markdown>;
  const phase = phaseOf(readroom, now);

  return (
    <Stack gap={12}>
      <Stack gap={4}>
        <Stack direction="row" gap={8} align="baseline" wrap navRow>
          <Text as="span" role="hint">
            {messages.readroom.task.source}
          </Text>
          {readroom.sourceUrl === undefined ? (
            <Text as="span">{readroom.codeRef}</Text>
          ) : (
            <Link href={readroom.sourceUrl} external>
              {readroom.codeRef}
            </Link>
          )}
          {readroom.revision === undefined ? null : (
            <Text as="span" role="hint">
              {`${messages.readroom.task.rev} ${readroom.revision}`}
            </Text>
          )}
          {readroom.ticket === undefined ? null : (
            <Link href={ticketPath(readroom.ticket)} className={styles.ticket}>
              <Tag>{`${messages.readroom.task.ticket} #${readroom.ticket}`}</Tag>
            </Link>
          )}
        </Stack>
        <Text role="hint">
          {`${messages.readroom.task.deadline} ${formatDeadlineDate(readroom.deadlineAt)}`}
        </Text>
        {phase === "published" && readroom.reportAt !== undefined ? (
          <Text role="hint">
            {`${messages.readroom.phases.published} ${formatDeadlineDate(readroom.reportAt)}`}
          </Text>
        ) : null}
        {phase === "archived" && readroom.archivedAt !== undefined ? (
          <Text role="hint">
            {`${messages.readroom.phases.archived} ${formatDeadlineDate(readroom.archivedAt)}`}
          </Text>
        ) : null}
      </Stack>

      <div className={styles.task} {...{ [READROOM_CARD_ATTR]: "" }}>
        <Markdown>{readroom.description}</Markdown>
      </div>

      <ReadroomView readroom={readroom} now={now} noteBodies={noteBodies} report={report} />
    </Stack>
  );
}
