"use client";

import type { MouseEvent } from "react";
import { Button, Heading, SegmentedControl, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import {
  hasUpvoted,
  rankReadroomMode,
  readroomModes,
  type Readroom,
  type ReadroomMode,
} from "../model/readrooms";
import { ReadroomCard } from "./ReadroomCard";
import styles from "../readroom.module.css";

/** The feed's compose control: closing the layer hands focus back to it. */
export const readroomComposeButtonId = "readroom-compose";

export type ReadroomFeedProps = {
  readrooms: readonly Readroom[];
  now: string;
  currentId?: string;
  // The community feed mode (Top/New/Active): session UI state, kept across
  // actor switches like the composed tasks (the mock contract of 01).
  mode: ReadroomMode;
  onModeChange: (mode: ReadroomMode) => void;
  // The session's handle for the vote chips (null reads as a guest).
  voter: string | null;
  // Session-composed tasks: their cards activate in place, without a link.
  localReadroomIds: ReadonlySet<string>;
  onActivate: (id: string, event?: MouseEvent<HTMLElement>) => void;
  onToggleVote: (id: string) => void;
  onCompose: () => void;
};

/** The readroom's feed: the mode's ranked tasks, stopped cycles included
 * under their ARCHIVED chip. */
export function ReadroomFeed({
  readrooms,
  now,
  currentId,
  mode,
  onModeChange,
  voter,
  localReadroomIds,
  onActivate,
  onToggleVote,
  onCompose,
}: ReadroomFeedProps) {
  const entries = rankReadroomMode(readrooms, mode, now);

  const cards = (tasks: readonly Readroom[]) =>
    tasks.map((readroom) => (
      <Stack key={readroom.id} navRow>
        <ReadroomCard
          readroom={readroom}
          now={now}
          current={readroom.id === currentId}
          local={localReadroomIds.has(readroom.id)}
          voted={hasUpvoted(readroom.upvotes, voter)}
          onVote={() => onToggleVote(readroom.id)}
          onActivate={(event) => onActivate(readroom.id, event)}
        />
      </Stack>
    ));

  return (
    <Stack gap={8} className={styles.feed}>
      <Heading level={1} className="sr-only">
        {messages.readroom.feed.heading}
      </Heading>

      <Stack direction="row" gap={8} align="center" justify="space-between" wrap>
        <Text role="hint">{formatCount(entries.length, pluralForms.task)}</Text>
        <Button id={readroomComposeButtonId} variant="primary" onClick={onCompose}>
          {messages.readroom.feed.newTask}
        </Button>
      </Stack>

      <Stack direction="row" gap={8} align="center" wrap navRow>
        <SegmentedControl
          mode="buttons"
          label={messages.readroom.feed.modeLabel}
          value={mode}
          onChange={onModeChange}
          options={readroomModes.map((entry) => ({
            value: entry,
            label: messages.readroom.feed.modes[entry],
          }))}
        />
      </Stack>

      {readrooms.length === 0 ? (
        <Text role="hint">{messages.readroom.feed.empty}</Text>
      ) : entries.length === 0 ? (
        <Text role="hint">{messages.readroom.feed.emptyMode}</Text>
      ) : (
        <Stack gap={8}>{cards(entries)}</Stack>
      )}
    </Stack>
  );
}
