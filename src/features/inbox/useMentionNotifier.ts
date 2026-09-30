"use client";

import { useCallback } from "react";
import { buildMentionDirectory } from "@/shared/mentions";
import { useMemberIdentities } from "@/shared/MemberIdentity";
import { enqueueInboxEvent } from "./inbox-store";
import { buildMentionEvents, mentionRedactedBody, type MentionEventInput } from "./mention-events";

// The per-message notifier the composers call after a successful save:
// resolves the body's handles against the roster and posts one event per
// recipient. The author travels in the input (the hook never reads the shell
// session), so server halves and guest gates keep their own rules. The subject
// names the author's current username; pass redactExcerpt for texts the
// recipient must not see (a readroom note before its deadline).
export type NotifyMentionsInput = Omit<
  MentionEventInput,
  "authorUser" | "directory" | "at" | "mentioner" | "excerpt"
> & {
  authorUser: string | null;
  redactExcerpt?: boolean;
};

export function useMentionNotifier(): (input: NotifyMentionsInput) => void {
  const identities = useMemberIdentities();
  return useCallback(
    (input: NotifyMentionsInput) => {
      if (input.authorUser === null) return;
      const { authorUser, redactExcerpt, ...rest } = input;
      const mentioner = identities[authorUser]?.username ?? authorUser;
      const directory = buildMentionDirectory(identities);
      const at = new Date().toISOString();
      for (const delivery of buildMentionEvents({
        ...rest,
        authorUser,
        mentioner,
        directory,
        at,
        ...(redactExcerpt === true ? { excerpt: mentionRedactedBody(mentioner) } : {}),
      }))
        enqueueInboxEvent(delivery.user, delivery.event);
    },
    [identities],
  );
}
