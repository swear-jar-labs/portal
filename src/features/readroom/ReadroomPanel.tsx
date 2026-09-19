import type { ReactNode } from "react";
import { Stack } from "@swearjar/dos";
import { Markdown } from "@/shared/Markdown/Markdown";
import type { Readroom } from "./readrooms";
import { ReadroomSourceRow } from "./ReadroomSourceRow";
import { ReadroomView } from "./ReadroomView";

export type ReadroomPanelProps = {
  readroom: Readroom;
  now: string;
};

/** The task's RSC half: the source block and the Markdown bodies rendered
 * through the pipeline — the client view receives prepared nodes, so the
 * fixture bodies never ship the pipeline to the client. Session facts layer on
 * top in ReadroomView. */
export function ReadroomPanel({ readroom, now }: ReadroomPanelProps) {
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
        now={now}
        description={<Markdown>{readroom.description}</Markdown>}
        noteBodies={noteBodies}
        report={report}
      />
    </Stack>
  );
}
