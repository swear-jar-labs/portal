import { Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ticketPath } from "@/features/tickets/contracts";
import { type Readroom } from "./readrooms";
import styles from "./readroom.module.css";

export type ReadroomSourceRowProps = {
  readroom: Readroom;
};

/** The task's meta row: the optional source permalink (the whole source — what
 * to read lives in the description), the optional ticket chip and the
 * curiosity tags. Both the routed panel (RSC) and a session-composed task
 * (client) render it. */
export function ReadroomSourceRow({ readroom }: ReadroomSourceRowProps) {
  const hasRow =
    readroom.sourceUrl !== undefined || readroom.ticket !== undefined || readroom.tags.length > 0;
  if (!hasRow) return null;

  return (
    <Stack direction="row" gap={8} align="baseline" wrap navRow>
      {readroom.sourceUrl === undefined ? null : (
        <>
          <Text as="span" role="hint">
            {messages.readroom.task.source}
          </Text>
          <Link href={readroom.sourceUrl} external>
            {readroom.sourceUrl}
          </Link>
        </>
      )}
      {readroom.ticket === undefined ? null : (
        <Link href={ticketPath(readroom.ticket)} className={styles.ticket}>
          <Tag>{`${messages.readroom.task.ticket} #${readroom.ticket}`}</Tag>
        </Link>
      )}
      {readroom.tags.map((tag) => (
        <Tag key={tag}>{messages.readroom.tags[tag]}</Tag>
      ))}
    </Stack>
  );
}
