"use client";

import { useMemo, type MouseEvent } from "react";
import { Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useOverlayPush, useShellSession } from "@/features/shell";
import { PROFILE_RECENT_COUNT } from "@/shared/profile";
import { toggleReadroomUpvote } from "../data/readroom-store";
import { useReadroomSession } from "../data/useReadroomSession";
import { hasUpvoted, readroomPath, recentTasksByLead, type Readroom } from "../model/readrooms";
import { ReadroomCard, readroomCardId } from "./ReadroomCard";

export type ReadroomRowsProps = {
  user: string;
  readrooms: readonly Readroom[];
  now: string;
  // The profile previews the freshest entries only.
  limit?: number;
  // The empty state reads from the hosting profile (own vs public wording).
  empty: string;
};

/** A member's readroom tasks: the feed's cards over the session store, newest
 * first. Tasks composed in this session have no route yet, so they read as
 * plain session lines like the profile's local threads. A card opens its task
 * as an overlay layer through a plain SPA push (modified clicks keep the
 * native tab behavior). */
export function ReadroomRows({
  user,
  readrooms,
  now,
  limit = PROFILE_RECENT_COUNT,
  empty,
}: ReadroomRowsProps) {
  const pushOverlay = useOverlayPush();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const { state, readrooms: visible } = useReadroomSession(readrooms);

  const localIds = useMemo(
    () => new Set(state.addedReadrooms.map((entry) => entry.id)),
    [state.addedReadrooms],
  );
  const mine = useMemo(() => recentTasksByLead(visible, user, limit), [visible, user, limit]);
  const localShown = mine.filter((entry) => localIds.has(entry.id));
  const routedShown = mine.filter((entry) => !localIds.has(entry.id));

  function toggleVote(id: string) {
    if (session === null) {
      requestLogin();
      return;
    }
    const target = visible.find((entry) => entry.id === id);
    if (target === undefined) return;
    toggleReadroomUpvote(id, session.user, target.upvotes);
  }

  const activate = (id: string) => (event?: MouseEvent<HTMLElement>) => {
    pushOverlay(readroomPath(id), readroomCardId(id))(event);
  };

  if (mine.length === 0) {
    return <Text role="hint">{empty}</Text>;
  }

  return (
    <Stack gap={8}>
      {localShown.map((entry) => (
        <Text key={entry.id}>
          {entry.title} · {messages.account.profile.tasks.sessionOnly}
        </Text>
      ))}
      {routedShown.map((entry) => (
        <Stack key={entry.id} navRow>
          <ReadroomCard
            readroom={entry}
            now={now}
            voted={hasUpvoted(entry.upvotes, session?.user ?? null)}
            onVote={() => toggleVote(entry.id)}
            onActivate={activate(entry.id)}
          />
        </Stack>
      ))}
    </Stack>
  );
}
