"use client";

import { Tag } from "@swearjar/dos";
import { pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";

// The caret is a control glyph, not a translatable string.
const VOTE_GLYPH = "▲";

export type VoteButtonProps = {
  votes: number;
  voted: boolean;
  onToggle: () => void;
  className?: string;
};

/** The upvote affordance: a chip with the count; pressed means "you voted". */
export function VoteButton({ votes, voted, onToggle, className }: VoteButtonProps) {
  return (
    <Tag active={voted} onClick={onToggle} className={className}>
      {`${VOTE_GLYPH} ${formatCount(votes, pluralForms.vote)}`}
    </Tag>
  );
}
