import type { ReactNode } from "react";
import { Stack } from "@swearjar/dos";
import { Markdown } from "@/shared/Markdown/Markdown";
import type { Ticket } from "@/features/tickets/contracts";
import type { Readroom } from "../model/readrooms";
import { ReadroomSourceRow } from "./ReadroomSourceRow";
import { ReadroomView } from "./ReadroomView";

export type ReadroomPanelProps = {
  readroom: Readroom;
  // The ticket queue for the linked-ticket row (fixtures; the view merges the
  // session's tickets).
  tickets: readonly Ticket[];
  now: string;
};

/** The task's RSC half: the source block and the Markdown bodies rendered
 * through the pipeline — the client view receives prepared nodes, so the
 * fixture bodies never ship the pipeline to the client. Session facts layer on
 * top in ReadroomView. */
export function ReadroomPanel({ readroom, tickets, now }: ReadroomPanelProps) {
  const noteBodies: Record<string, ReactNode> = {};
  for (const note of readroom.notes) {
    noteBodies[note.id] = <Markdown>{note.body}</Markdown>;
  }
  const report = readroom.report === undefined ? undefined : <Markdown>{readroom.report}</Markdown>;

  return (
    <Stack gap={12}>
      <ReadroomSourceRow readroom={readroom} />
      <ReadroomView
        readroom={readroom}
        tickets={tickets}
        now={now}
        description={<Markdown>{readroom.description}</Markdown>}
        noteBodies={noteBodies}
        report={report}
      />
    </Stack>
  );
}
