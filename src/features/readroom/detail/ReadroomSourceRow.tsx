import { Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { type Readroom } from "../model/readrooms";

export type ReadroomSourceRowProps = {
  readroom: Readroom;
};

/** The task's optional source permalink (what to read lives in the description).
 * Tags live with the vote and phase in ReadroomDetailsRow. The linked ticket
 * lives under the attached files (ReadroomTicketRow). Both the routed panel
 * (RSC) and a session-composed task (client) render it. */
export function ReadroomSourceRow({ readroom }: ReadroomSourceRowProps) {
  if (readroom.sourceUrl === undefined) return null;

  return (
    <Stack gap={2}>
      <Text as="span" role="hint">
        {messages.readroom.task.source}
      </Text>
      <Stack direction="row" gap={8} align="baseline" wrap navRow>
        <Link href={readroom.sourceUrl} external>
          {readroom.sourceUrl}
        </Link>
      </Stack>
    </Stack>
  );
}
