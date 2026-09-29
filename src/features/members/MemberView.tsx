import { Avatar, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ThreadRows, type BoardMember, type ThreadSummary } from "@/features/board/contracts";
import type { Project } from "@/features/projects/contracts";
import { ReadroomRows, type Readroom } from "@/features/readroom/contracts";
import { MemberProjects } from "./MemberProjects";

export type MemberViewProps = {
  member: BoardMember;
  // The stable account key behind a renamed username: team and task
  // memberships resolve by it, while the header shows the display name.
  userKey: string;
  bio?: string;
  roleLabel?: string;
  threads: readonly ThreadSummary[];
  projects: readonly Project[];
  readrooms: readonly Readroom[];
  now: string;
};

export function MemberView({
  member,
  userKey,
  bio,
  roleLabel,
  threads,
  projects,
  readrooms,
  now,
}: MemberViewProps) {
  return (
    <Stack gap={10}>
      <Stack direction="row" gap={10} align="center">
        <Avatar user={member.user} src={member.avatar} size="lg" />
        <Stack gap={2}>
          <Heading level={1}>{member.user}</Heading>
          <Text role="hint">{roleLabel ?? messages.board.roles[member.role]}</Text>
        </Stack>
      </Stack>
      {bio ? <Text>{bio}</Text> : null}

      <Stack gap={4}>
        <Heading level={2}>{messages.members.projects.heading}</Heading>
        {projects.length === 0 ? (
          <Text role="hint">{messages.members.projects.empty}</Text>
        ) : (
          <MemberProjects projects={projects} />
        )}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.members.threads.heading}</Heading>
        {threads.length === 0 ? (
          <Text role="hint">{messages.members.threads.empty}</Text>
        ) : (
          <ThreadRows threads={threads} now={now} />
        )}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.members.tasks.heading}</Heading>
        <ReadroomRows
          user={userKey}
          readrooms={readrooms}
          now={now}
          empty={messages.members.tasks.empty}
        />
      </Stack>
    </Stack>
  );
}
