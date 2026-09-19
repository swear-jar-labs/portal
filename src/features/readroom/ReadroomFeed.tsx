"use client";

import type { MouseEvent } from "react";
import { Heading, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { phaseOf, rankReadrooms, type Readroom } from "./readrooms";
import { ReadroomCard } from "./ReadroomCard";
import styles from "./readroom.module.css";

export type ReadroomFeedProps = {
  readrooms: readonly Readroom[];
  now: string;
  currentId?: string;
  onActivate: (id: string, event?: MouseEvent<HTMLElement>) => void;
};

/** The readroom's feed: the ranked tasks and the archive section of its own. */
export function ReadroomFeed({ readrooms, now, currentId, onActivate }: ReadroomFeedProps) {
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
          onActivate={(event) => onActivate(readroom.id, event)}
        />
      </Stack>
    ));

  return (
    <Stack gap={8} className={styles.feed}>
      <Heading level={1} className="sr-only">
        {messages.readroom.feed.heading}
      </Heading>

      <Text role="hint">{formatCount(ranked.length, pluralForms.task)}</Text>

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
