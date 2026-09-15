import { Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import type { MemberProfile } from "@/data/account";

export function ProfileView({ profile }: { profile: MemberProfile }) {
  return (
    <Stack gap={10}>
      <Heading level={1} tone="yellow">
        {profile.user}
      </Heading>
      <Text tone="dim">
        {messages.account.profile.roles[profile.role]} · {messages.account.profile.joined}{" "}
        {profile.joined}
      </Text>
      <Text>{profile.bio}</Text>

      <Stack gap={2}>
        {profile.stats.map((stat) => (
          <Text key={stat.id}>
            {messages.account.profile.stats[stat.id]}: {stat.value}
          </Text>
        ))}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.account.profile.activityHeading}</Heading>
        {profile.activity.length === 0 ? (
          <Text tone="dim">{messages.account.profile.activityEmpty}</Text>
        ) : (
          profile.activity.map((entry) => <Text key={entry}>{entry}</Text>)
        )}
      </Stack>
    </Stack>
  );
}
