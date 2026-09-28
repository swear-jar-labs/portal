"use client";

import type { MouseEvent } from "react";
import { Card, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { avatarFor } from "@/shared/members";
import { noteElementId, readroomPath, reportElementId, type Readroom } from "../model/readrooms";
import type { ReadroomHit } from "../model/search";
import { readroomCardId } from "./ReadroomCard";
import styles from "../readroom.module.css";

type Props = {
  hits: readonly ReadroomHit[];
  readrooms: readonly Readroom[];
  localReadroomIds: ReadonlySet<string>;
  currentId?: string;
  onJump: (hit: ReadroomHit, event?: MouseEvent<HTMLElement>) => void;
};

function hitHref(hit: ReadroomHit): string {
  const anchor =
    hit.kind === "note" && hit.noteId
      ? noteElementId(hit.noteId)
      : hit.kind === "report"
        ? reportElementId(hit.taskId)
        : undefined;
  return `${readroomPath(hit.taskId)}${anchor ? `#${anchor}` : ""}`;
}

/** One task can have several hits. Each hit has a direct target, and the
 * fragment is rendered as text nodes so search input cannot inject markup. */
export function ReadroomSearchResults({
  hits,
  readrooms,
  localReadroomIds,
  currentId,
  onJump,
}: Props) {
  const byId = new Map(readrooms.map((task) => [task.id, task]));
  const first = new Set<string>();
  return (
    <Stack gap={8}>
      {hits.map((hit) => {
        const task = byId.get(hit.taskId);
        if (!task) return null;
        const key = `${hit.taskId}:${hit.kind}:${hit.noteId ?? ""}`;
        const firstForTask = !first.has(hit.taskId);
        first.add(hit.taskId);
        const activation = localReadroomIds.has(hit.taskId)
          ? { onActivate: (event?: MouseEvent<HTMLElement>) => onJump(hit, event) }
          : {
              href: hitHref(hit),
              onActivate: (event?: MouseEvent<HTMLElement>) => onJump(hit, event),
            };
        return (
          <Stack key={key} navRow>
            <Card
              id={firstForTask ? readroomCardId(hit.taskId) : undefined}
              title={task.title}
              className={styles.searchCard}
              current={currentId === hit.taskId}
              {...activation}
              metaPosition="before"
              metaInteractive
              meta={
                <Stack direction="row" gap={6} align="center" wrap>
                  <MemberLink
                    person={
                      hit.author ? { user: hit.author, avatar: avatarFor(hit.author) } : task.lead
                    }
                    avatarSize="sm"
                  />
                  <Text as="span" role="hint">
                    {messages.readroom.feed.search.kinds[hit.kind]}
                  </Text>
                </Stack>
              }
              actions={
                <div className={styles.searchFragment}>
                  {hit.fragment.segments.map((segment, index) =>
                    segment.hit ? (
                      <mark key={index} className={styles.searchHit}>
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={index}>{segment.text}</span>
                    ),
                  )}
                </div>
              }
            />
          </Stack>
        );
      })}
    </Stack>
  );
}
