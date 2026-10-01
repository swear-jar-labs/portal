import type { ReactNode } from "react";
import { Stack, Tag } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { techTagTone } from "@/content/techs";
import { VoteButton } from "@/features/board/contracts";
import { phaseTones, type Readroom, type ReadroomPhase } from "./model/readrooms";

type ReadroomDetailsRowProps = {
  readroom: Readroom;
  phase: ReadroomPhase;
  voted: boolean;
  onVote: () => void;
  // The feed keeps its ticket chip here; the task has a separate ticket block.
  ticketLink?: ReactNode;
  navRow?: boolean;
  className?: string;
};

/** Shared ordering and chip presentation for the feed and the open task. */
export function ReadroomDetailsRow({
  readroom,
  phase,
  voted,
  onVote,
  ticketLink,
  navRow,
  className,
}: ReadroomDetailsRowProps) {
  return (
    <Stack direction="row" gap={6} align="center" wrap navRow={navRow} className={className}>
      <VoteButton votes={readroom.upvotes.length} voted={voted} onToggle={onVote} />
      <Tag tone={phaseTones[phase]}>{messages.readroom.phases[phase]}</Tag>
      {ticketLink}
      {readroom.tags.map((tag) => (
        <Tag key={tag} tone={techTagTone}>
          {messages.readroom.tags[tag]}
        </Tag>
      ))}
    </Stack>
  );
}
