"use client";

import { Avatar, Button, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import {
  ThreadRows,
  useForumActivity,
  type ForumActivitySeed,
  type ThreadSummary,
} from "@/features/board/contracts";
import type { Readroom } from "@/features/readroom/contracts";
import type { Ticket } from "@/features/tickets/contracts";
import type { MemberProfile } from "./data";
import { ProfileActivity } from "./ProfileActivity";

export type ProfileViewProps = {
  profile: MemberProfile;
  threads: readonly ThreadSummary[];
  forumSeed: ForumActivitySeed;
  tickets: readonly Ticket[];
  readrooms: readonly Readroom[];
  user: string;
  now: string;
  onEdit: () => void;
  editButtonId: string;
  saved: boolean;
};

export function ProfileView({
  profile,
  threads,
  forumSeed,
  tickets,
  readrooms,
  user,
  now,
  onEdit,
  editButtonId,
  saved,
}: ProfileViewProps) {
  const forum = useForumActivity(user, forumSeed, threads);
  const hasThreads = threads.length > 0 || forum.localThreads.length > 0;

  return (
    <Stack gap={10}>
      <Stack direction="row" gap={10} align="center">
        <Avatar user={profile.user} src={profile.avatar} size="lg" />
        <Stack gap={2}>
          <Heading level={1}>{profile.user}</Heading>
          <Text role="hint">
            {messages.account.profile.roles[profile.role]}
            {profile.admin ? ` · ${messages.account.profile.admin}` : null} ·{" "}
            {messages.account.profile.joined} {profile.joined}
          </Text>
        </Stack>
      </Stack>
      <Text>{profile.bio}</Text>
      <div>
        <Button id={editButtonId} onClick={onEdit}>
          {messages.account.profile.edit.open}
        </Button>
      </div>
      {saved ? <Text role="positive">{messages.account.profile.edit.saved}</Text> : null}

      <ProfileActivity user={user} tickets={tickets} readrooms={readrooms} forum={forum} />

      <Stack gap={4}>
        <Heading level={2}>{messages.account.profile.threads.heading}</Heading>
        {!hasThreads ? (
          <Text role="hint">{messages.account.profile.threads.empty}</Text>
        ) : (
          <>
            {forum.localThreads.map((thread) => (
              <Text key={thread.id}>
                {thread.title} · {messages.account.profile.threads.sessionOnly}
              </Text>
            ))}
            <ThreadRows threads={forum.threads} now={now} />
          </>
        )}
      </Stack>
    </Stack>
  );
}
