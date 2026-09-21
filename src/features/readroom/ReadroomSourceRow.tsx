import { Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { type Readroom } from "./readrooms";

export type ReadroomSourceRowProps = {
  readroom: Readroom;
};

/** The task's meta row: the optional source permalink (the whole source — what
 * to read lives in the description) and the curiosity tags. The linked ticket
 * lives under the attached files (ReadroomTicketRow). Both the routed panel
 * (RSC) and a session-composed task (client) render it. */
export function ReadroomSourceRow({ readroom }: ReadroomSourceRowProps) {
  const hasRow = readroom.sourceUrl !== undefined || readroom.tags.length > 0;
  if (!hasRow) return null;

  return (
    <Stack gap={2}>
      {readroom.sourceUrl === undefined ? null : (
        <Text as="span" role="hint">
          {messages.readroom.task.source}
        </Text>
      )}
      <Stack direction="row" gap={8} align="baseline" wrap navRow>
        {readroom.sourceUrl === undefined ? null : (
          <Link href={readroom.sourceUrl} external>
            {readroom.sourceUrl}
          </Link>
        )}
        {readroom.tags.map((tag) => (
          <Tag key={tag}>{messages.readroom.tags[tag]}</Tag>
        ))}
      </Stack>
    </Stack>
  );
}
