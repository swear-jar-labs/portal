import { Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberName } from "@/shared/MemberIdentity";
import { formatTimestamp } from "@/lib/format";
import type { MemberApplication } from "../model/applications";
import styles from "./ApplicationHistory.module.css";

const copy = messages.account.apply.history;

export function ApplicationHistory({
  applications,
  headingLevel = 2,
}: {
  applications: readonly MemberApplication[];
  headingLevel?: 2 | 3;
}) {
  if (applications.length === 0) return null;
  return (
    <Stack gap={8} className={styles.history}>
      <Heading level={headingLevel}>{copy.heading}</Heading>
      {[...applications].reverse().map((application) => (
        <Stack key={application.id} gap={4}>
          <Text role="accent">{messages.account.apply.statuses[application.status]}</Text>
          <Text role="hint">
            {copy.weeklyHours}:{" "}
            {messages.account.apply.weeklyHours[application.details.weeklyHours]}
          </Text>
          <Text role="hint">
            {copy.experience}: {application.details.experience || copy.none}
          </Text>
          <Text role="hint">
            {copy.motivation}: {application.details.motivation}
          </Text>
          <ol>
            {application.history.map((event, index) => (
              <li key={`${application.id}-${index}`}>
                <Text>
                  {copy.events[event.kind]} · <MemberName user={event.by} /> ·{" "}
                  {formatTimestamp(event.at)}
                </Text>
                {event.note ? <Text>{event.note}</Text> : null}
              </li>
            ))}
          </ol>
        </Stack>
      ))}
    </Stack>
  );
}
