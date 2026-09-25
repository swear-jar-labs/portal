"use client";

import {
  Button,
  Checkbox,
  FileIcon,
  Heading,
  SegmentedControl,
  Stack,
  Table,
  Text,
  type TableColumn,
} from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/shared/age";
import { INBOX_FEED_ID, inboxRowId, type InboxNotification, type InboxView } from "./inbox";
import styles from "./inbox.module.css";

export type InboxFeedProps = {
  list: readonly InboxNotification[];
  visible: readonly InboxNotification[];
  unread: number;
  archivedCount: number;
  view: InboxView;
  unreadOnly: boolean;
  selectedId: string | null;
  now: string;
  onViewChange: (view: InboxView) => void;
  onUnreadOnlyChange: (value: boolean) => void;
  onSelect: (id: string) => void;
  onMarkAllRead: () => void;
};

const copy = messages.inbox;

export function InboxFeed({
  list,
  visible,
  unread,
  archivedCount,
  view,
  unreadOnly,
  selectedId,
  now,
  onViewChange,
  onUnreadOnlyChange,
  onSelect,
  onMarkAllRead,
}: InboxFeedProps) {
  const columns: TableColumn<InboxNotification>[] = [
    {
      id: "status",
      label: copy.fresh,
      className: styles.statusCell,
      render: (entry) =>
        entry.read ? (
          ""
        ) : (
          <span className={styles.mailIcon} role="img" aria-label={copy.fresh}>
            <FileIcon kind="exe" icon="mail" />
          </span>
        ),
    },
    {
      id: "subject",
      label: copy.columns.subject,
      minWidth: "220px",
      action: (entry) => ({
        id: inboxRowId(entry.id),
        content: entry.subject,
        onActivate: () => onSelect(entry.id),
        current: entry.id === selectedId,
        rowActivation: true,
      }),
    },
    {
      id: "source",
      label: copy.columns.source,
      width: "14ch",
      render: (entry) => entry.source,
    },
    {
      id: "date",
      label: copy.columns.date,
      width: "10ch",
      align: "right",
      render: (entry) => formatAge(entry.at, now, copy.age),
    },
  ];

  const inboxItems = view === "inbox" ? list.filter((entry) => !entry.archived) : [];
  const empty =
    view === "archive" ? (
      <Text>{copy.emptyArchive}</Text>
    ) : inboxItems.length === 0 ? (
      <Text>{copy.empty}</Text>
    ) : (
      <Text>{copy.allRead}</Text>
    );

  return (
    <Stack id={INBOX_FEED_ID} tabIndex={-1} gap={8}>
      <Stack direction="row" gap={8} align="center">
        <Heading level={2}>{copy.heading}</Heading>
        <Text>
          {formatCount(unread, pluralForms.message)} {copy.unread}
        </Text>
      </Stack>
      <Stack direction="row" gap={4} wrap>
        <SegmentedControl
          mode="buttons"
          label={copy.viewsLabel}
          value={view}
          onChange={onViewChange}
          options={[
            { value: "inbox", label: copy.views.inbox },
            { value: "archive", label: `${copy.views.archive} (${archivedCount})` },
          ]}
        />
        <Checkbox
          name="inbox-unread-only"
          checked={unreadOnly}
          onChange={onUnreadOnlyChange}
          label={copy.unreadOnly}
        />
        {view === "inbox" ? (
          <Button onClick={onMarkAllRead} disabled={unread === 0}>
            {copy.markAllRead}
          </Button>
        ) : null}
      </Stack>
      {visible.length === 0 ? (
        empty
      ) : (
        <Table
          className={styles.inboxTable}
          columns={columns}
          items={[...visible]}
          rowKey={(entry) => entry.id}
          rowClassName={() => styles.inboxRow}
          label={copy.heading}
          navigationBoundary
        />
      )}
    </Stack>
  );
}
