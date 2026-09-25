"use client";

import { Button, Heading, Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { formatTimestamp } from "@/lib/format";
import { useOverlayPush } from "@/features/shell";
import type { InboxNotification } from "./inbox";

export type InboxDetailProps = {
  entry: InboxNotification;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onRestore: () => void;
};

const copy = messages.inbox.detail;
const kinds = messages.inbox.kinds;

// The stable origin for the overlay focus return: closing the target layer
// lands back on the link that opened it.
const INBOX_TARGET_LINK_ID = "inbox-target-link";

export function InboxDetail({
  entry,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onRestore,
}: InboxDetailProps) {
  const pushOverlay = useOverlayPush();

  return (
    <Stack gap={8}>
      <Heading level={2}>{entry.subject}</Heading>
      <Stack gap={2}>
        <Text>
          {messages.inbox.detail.from}: {entry.source}
        </Text>
        <Text>
          {messages.inbox.detail.kind}: {kinds[entry.kind]}
        </Text>
        <Text>
          {messages.inbox.detail.date}: {formatTimestamp(entry.at)}
        </Text>
      </Stack>
      <Text>{entry.body}</Text>
      {entry.available ? (
        <Text>
          <Link
            id={INBOX_TARGET_LINK_ID}
            href={entry.target.href}
            underline
            onClick={pushOverlay(entry.target.href, INBOX_TARGET_LINK_ID)}
          >
            {copy.open} {entry.target.label}
          </Link>
        </Text>
      ) : (
        <Stack gap={4}>
          <Text role="danger">{copy.unavailableHeading}</Text>
          <Text>{entry.unavailableReason}</Text>
        </Stack>
      )}
      <Stack direction="row" gap={4} wrap>
        {entry.read ? (
          <Button onClick={onMarkUnread}>{copy.markUnread}</Button>
        ) : (
          <Button onClick={onMarkRead}>{copy.markRead}</Button>
        )}
        {entry.archived ? (
          <Button onClick={onRestore}>{copy.restore}</Button>
        ) : (
          <Button onClick={onArchive}>{copy.archive}</Button>
        )}
      </Stack>
      <Text role="hint">{copy.hint}</Text>
    </Stack>
  );
}
