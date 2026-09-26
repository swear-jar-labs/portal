import { Avatar, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ThreadRows, type BoardMember, type ThreadSummary } from "@/features/board/contracts";

export type MemberViewProps = {
  member: BoardMember;
  bio?: string;
  roleLabel?: string;
  threads: readonly ThreadSummary[];
  now: string;
};

export function MemberView({ member, bio, roleLabel, threads, now }: MemberViewProps) {
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
        <Heading level={2}>{messages.members.threads.heading}</Heading>
        {threads.length === 0 ? (
          <Text role="hint">{messages.members.threads.empty}</Text>
        ) : (
          <ThreadRows threads={threads} now={now} />
        )}
      </Stack>
    </Stack>
  );
}
