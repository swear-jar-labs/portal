"use client";

import { Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import type { ForumActivityCounts } from "@/features/board/contracts";
import { useReadroomSession, type Readroom } from "@/features/readroom/contracts";
import { countDoneBySize, useMergedTickets, type Ticket } from "@/features/tickets/contracts";
import { readroomActivityCounts } from "../data/profile-activity";
import styles from "./ProfileActivity.module.css";

const copy = messages.account.profile.stats;

function ActivityGroup({
  heading,
  values,
}: {
  heading: string;
  values: readonly { label: string; value: number }[];
}) {
  return (
    <section className={styles.group}>
      <Heading level={3}>{heading}</Heading>
      <dl className={styles.values}>
        {values.map(({ label, value }) => (
          <div className={styles.value} key={label}>
            <dt>
              <Text as="span" role="hint">
                {label}
              </Text>
            </dt>
            <dd>
              <Text as="span" role="accent">
                {value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProfileActivity({
  user,
  tickets,
  readrooms,
  forum,
}: {
  user: string;
  tickets: readonly Ticket[];
  readrooms: readonly Readroom[];
  forum: ForumActivityCounts;
}) {
  const currentTickets = useMergedTickets(tickets);
  const { readrooms: currentReadrooms } = useReadroomSession(readrooms);
  const done = countDoneBySize(currentTickets, user);
  const reading = readroomActivityCounts(currentReadrooms, user);

  return (
    <Stack as="section" gap={8}>
      <Heading level={2}>{copy.heading}</Heading>
      <div className={styles.groups}>
        <ActivityGroup
          heading={copy.tickets}
          values={[
            { label: "S", value: done.S },
            { label: "M", value: done.M },
            { label: "L", value: done.L },
          ]}
        />
        <ActivityGroup
          heading={copy.forum}
          values={[
            { label: copy.posts, value: forum.posts },
            { label: copy.replies, value: forum.replies },
          ]}
        />
        <ActivityGroup
          heading={copy.readroom}
          values={[
            { label: copy.tasks, value: reading.tasks },
            { label: copy.answered, value: reading.answered },
          ]}
        />
      </div>
    </Stack>
  );
}
