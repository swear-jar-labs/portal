"use client";

import type { MouseEvent } from "react";
import { Card, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { avatarFor } from "@/shared/members";
import { boardTitle, formatAge, threadPath, type ThreadSummary } from "../model/threads";
import { postHash } from "../model/post-anchor";
import type { SearchFragment, ThreadSearchHit } from "../model/search";
import { threadCardId } from "./ThreadCard";
import styles from "../board.module.css";

export type SearchResultsProps = {
  // Hit threads in feed rank order (the current sort still applies); every
  // visible match renders its own post row underneath, title hits first.
  threads: readonly ThreadSummary[];
  now: string;
  hits: ReadonlyMap<string, ThreadSearchHit>;
  currentThreadId?: string;
  // Session-composed threads: their cards activate in place, without a link.
  localThreadIds: ReadonlySet<string>;
  onJumpToMatch: (
    threadId: string,
    postId: string | undefined,
    event?: MouseEvent<HTMLElement>,
  ) => void;
};

function FragmentText({ fragment }: { fragment: SearchFragment }) {
  return (
    <>
      {fragment.segments.map((segment, index) =>
        segment.hit ? (
          <mark key={index} className={styles.fragmentHit}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function matchHref(threadId: string, postId: string | undefined): string {
  return postId === undefined ? threadPath(threadId) : `${threadPath(threadId)}${postHash(postId)}`;
}

/** Flat post hits: one card per matching post (or title), reading like a
 * regular post — the thread title on top, the author's byline with role and
 * age, the match as a highlighted body line. The title link stretches over
 * the whole card, so anything but the profile opens the thread straight at
 * the match; the byline link is the only other target. Segments render as
 * text nodes, never as HTML, so neither the query nor the body can inject
 * markup. Threads beyond the per-thread cap note it in plain text — every
 * match stays reachable through the open thread. */
export function SearchResults({
  threads,
  now,
  hits,
  currentThreadId,
  localThreadIds,
  onJumpToMatch,
}: SearchResultsProps) {
  return (
    <Stack gap={8}>
      {threads.map((thread) => {
        const hit = hits.get(thread.id);
        if (hit === undefined) return null;
        const rest = hit.totalMatches - hit.matches.length;
        return (
          <Stack key={thread.id} gap={8}>
            {hit.matches.map((match, index) => {
              const person =
                match.author === undefined
                  ? thread.author
                  : { user: match.author, avatar: avatarFor(match.author) };
              const role = match.role ?? thread.author.role;
              const meta = [messages.board.roles[role], formatAge(match.createdAt, now)];
              const jump = (event?: MouseEvent<HTMLElement>) =>
                onJumpToMatch(thread.id, match.postId, event);
              // A composed thread has no route: the card activates in place
              // instead of linking to a page that does not exist.
              const activation = localThreadIds.has(thread.id)
                ? { onActivate: jump }
                : { href: matchHref(thread.id, match.postId), onActivate: jump };
              return (
                <Stack key={match.postId ?? "title"} navRow>
                  <Card
                    id={index === 0 ? threadCardId(thread.id) : undefined}
                    title={thread.title}
                    className={styles.cardTitle}
                    current={thread.id === currentThreadId}
                    {...activation}
                    metaPosition="before"
                    metaInteractive
                    meta={
                      <Stack direction="row" gap={6} align="center" wrap>
                        <Text as="span" role="hint">
                          {boardTitle(thread.board)}
                        </Text>
                        <MemberLink person={person} avatarSize="sm" />
                        <Text as="span" role="hint">
                          {meta.join(" · ")}
                        </Text>
                        <Text as="span" role="hint">
                          {match.postId === undefined
                            ? messages.board.feed.search.titleMatch
                            : messages.board.feed.search.replyMatch}
                        </Text>
                      </Stack>
                    }
                    actions={
                      <div className={styles.resultMatch}>
                        <FragmentText fragment={match.fragment} />
                      </div>
                    }
                  />
                </Stack>
              );
            })}
            {rest > 0 ? <Text role="hint">{messages.board.feed.search.restMatches}</Text> : null}
          </Stack>
        );
      })}
    </Stack>
  );
}
