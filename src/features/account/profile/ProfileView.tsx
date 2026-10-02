"use client";

import type { MouseEvent } from "react";
import { Avatar, Button, Card, Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { READROOM_PATH } from "@/content/commands";
import { messages } from "@/content/messages";
import {
  FEED_PATH,
  ThreadRows,
  useForumActivity,
  type ForumActivitySeed,
  type ThreadSummary,
} from "@/features/board/contracts";
import { ReadroomRows, type Readroom } from "@/features/readroom/contracts";
import {
  PROJECTS_PATH,
  projectCardId,
  projectPath,
  projectStatusTones,
  type Project,
} from "@/features/projects/contracts";
import { useOverlayPush } from "@/features/shell";
import type { Ticket } from "@/features/tickets/contracts";
import { PROFILE_RECENT_COUNT } from "@/shared/profile";
import type { MemberProfile } from "../data/queries";
import { ProfileActivity } from "./ProfileActivity";

export type ProfileViewProps = {
  profile: MemberProfile;
  threads: readonly ThreadSummary[];
  forumSeed: ForumActivitySeed;
  tickets: readonly Ticket[];
  readrooms: readonly Readroom[];
  projects: readonly Project[];
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
  projects,
  user,
  now,
  onEdit,
  editButtonId,
  saved,
}: ProfileViewProps) {
  const forum = useForumActivity(user, forumSeed, threads);
  const hasThreads = threads.length > 0 || forum.localThreads.length > 0;
  // Session-composed threads are the freshest by definition, so they take
  // the first preview slots and the fixtures fill the rest.
  const localShownThreads = forum.localThreads.slice(0, PROFILE_RECENT_COUNT);
  const threadLimit = PROFILE_RECENT_COUNT - localShownThreads.length;
  const pushOverlay = useOverlayPush();

  // Memberships are few, so the profile lists every project as a compact row
  // (title plus lifecycle): the full feed card stays where the registry is.
  const activateProject = (project: Project) => (event?: MouseEvent<HTMLElement>) => {
    pushOverlay(projectPath(project.slug), projectCardId(project.slug))(event);
  };

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
        <Heading level={2}>{messages.account.profile.projects.heading}</Heading>
        {projects.length === 0 ? (
          <Text role="hint">
            {messages.account.profile.projects.empty}{" "}
            <Link href={PROJECTS_PATH}>{messages.account.profile.projects.emptyLink}</Link>
          </Text>
        ) : (
          <Stack gap={8}>
            {projects.map((project) => (
              <Card
                key={project.slug}
                id={projectCardId(project.slug)}
                title={project.name}
                href={projectPath(project.slug)}
                onActivate={activateProject(project)}
                meta={
                  <Tag tone={projectStatusTones[project.status]}>
                    {messages.projects.statuses[project.status]}
                  </Tag>
                }
                metaPosition="before"
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.account.profile.threads.heading}</Heading>
        {!hasThreads ? (
          <Text role="hint">
            {messages.account.profile.threads.empty}{" "}
            <Link href={FEED_PATH}>{messages.account.profile.threads.emptyLink}</Link>
          </Text>
        ) : (
          <>
            {localShownThreads.map((thread) => (
              <Text key={thread.id}>
                {thread.title} · {messages.account.profile.threads.sessionOnly}
              </Text>
            ))}
            {threadLimit > 0 ? (
              <ThreadRows threads={forum.threads} now={now} limit={threadLimit} />
            ) : null}
          </>
        )}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.account.profile.tasks.heading}</Heading>
        <ReadroomRows
          user={user}
          readrooms={readrooms}
          now={now}
          empty={
            <>
              {messages.account.profile.tasks.empty}{" "}
              <Link href={READROOM_PATH}>{messages.account.profile.tasks.emptyLink}</Link>
            </>
          }
        />
      </Stack>
    </Stack>
  );
}
