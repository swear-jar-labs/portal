"use client";

import type { MouseEvent } from "react";
import { Button, Heading, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { phaseOf, rankReadrooms, type Readroom } from "./readrooms";
import { ReadroomCard } from "./ReadroomCard";
import styles from "./readroom.module.css";

/** The feed's compose control: closing the layer hands focus back to it. */
export const readroomComposeButtonId = "readroom-compose";

export type ReadroomFeedProps = {
  readrooms: readonly Readroom[];
  now: string;
  currentId?: string;
  // Session-composed tasks: their cards activate in place, without a link.
  localReadroomIds: ReadonlySet<string>;
  onActivate: (id: string, event?: MouseEvent<HTMLElement>) => void;
  onCompose: () => void;
};

/** The readroom's feed: the ranked tasks and the archive section of its own. */
export function ReadroomFeed({
  readrooms,
  now,
  currentId,
  localReadroomIds,
  onActivate,
  onCompose,
}: ReadroomFeedProps) {
  const ranked = rankReadrooms(readrooms, now);
  const active = ranked.filter((readroom) => phaseOf(readroom, now) !== "archived");
  const archived = ranked.filter((readroom) => phaseOf(readroom, now) === "archived");

  const cards = (entries: readonly Readroom[]) =>
    entries.map((readroom) => (
      <Stack key={readroom.id} navRow>
        <ReadroomCard
          readroom={readroom}
          now={now}
          current={readroom.id === currentId}
          local={localReadroomIds.has(readroom.id)}
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
        <Text role="hint">{formatCount(ranked.length, pluralForms.task)}</Text>
        <Button id={readroomComposeButtonId} variant="primary" onClick={onCompose}>
          {messages.readroom.feed.newTask}
        </Button>
      </Stack>

      {ranked.length === 0 ? (
        <Text role="hint">{messages.readroom.feed.empty}</Text>
      ) : (
        <>
          {active.length === 0 ? null : <Stack gap={8}>{cards(active)}</Stack>}
          {archived.length === 0 ? null : (
            <Stack gap={8}>
              <Heading level={2}>{messages.readroom.feed.archiveHeading}</Heading>
              {cards(archived)}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
