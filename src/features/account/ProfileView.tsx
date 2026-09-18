import { Avatar, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ThreadRows, type ThreadSummary } from "@/features/board/contracts";
import type { MemberProfile } from "./data";

export type ProfileViewProps = {
  profile: MemberProfile;
  threads: readonly ThreadSummary[];
  now: string;
};

export function ProfileView({ profile, threads, now }: ProfileViewProps) {
  return (
    <Stack gap={10}>
      <Stack direction="row" gap={10} align="center">
        <Avatar user={profile.user} src={profile.avatar} size="lg" />
        <Stack gap={2}>
          <Heading level={1}>{profile.user}</Heading>
          <Text role="hint">
            {messages.account.profile.roles[profile.role]} · {messages.account.profile.joined}{" "}
            {profile.joined}
          </Text>
        </Stack>
      </Stack>
      <Text>{profile.bio}</Text>

      <Stack gap={2}>
        {profile.stats.map((stat) => (
          <Text key={stat.id}>
            {messages.account.profile.stats[stat.id]}: {stat.value}
          </Text>
        ))}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.account.profile.threads.heading}</Heading>
        {threads.length === 0 ? (
          <Text role="hint">{messages.account.profile.threads.empty}</Text>
        ) : (
          <ThreadRows threads={threads} now={now} />
        )}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.account.profile.activityHeading}</Heading>
        {profile.activity.length === 0 ? (
          <Text role="hint">{messages.account.profile.activityEmpty}</Text>
        ) : (
          profile.activity.map((entry) => <Text key={entry}>{entry}</Text>)
        )}
      </Stack>
    </Stack>
  );
}
