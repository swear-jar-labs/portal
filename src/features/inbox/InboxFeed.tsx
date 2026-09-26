"use client";

import {
  Button,
  Checkbox,
  FileIcon,
  Heading,
  Stack,
  Table,
  Text,
  type TableColumn,
} from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/shared/age";
import { INBOX_FEED_ID, inboxRowId, type InboxNotification } from "./inbox";
import styles from "./inbox.module.css";

export type InboxFeedProps = {
  list: readonly InboxNotification[];
  visible: readonly InboxNotification[];
  unread: number;
  unreadOnly: boolean;
  selectedId: string | null;
  selectedIds: ReadonlySet<string>;
  now: string;
  onUnreadOnlyChange: (value: boolean) => void;
  onSelect: (id: string) => void;
  onToggleSelected: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleSelectedRead: (read: boolean) => void;
  onDeleteSelected: () => void;
};

const copy = messages.inbox;
const NARROW_COLUMN_WIDTH = "32px";

export function InboxFeed({
  list,
  visible,
  unread,
  unreadOnly,
  selectedId,
  selectedIds,
  now,
  onUnreadOnlyChange,
  onSelect,
  onToggleSelected,
  onToggleAll,
  onToggleSelectedRead,
  onDeleteSelected,
}: InboxFeedProps) {
  const visibleIds = visible.map((entry) => entry.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const selectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const markRead = visible.some((entry) => selectedIds.has(entry.id) && !entry.read);
  const columns: TableColumn<InboxNotification>[] = [
    {
      id: "select",
      label: (
        <Checkbox
          name="inbox-select-all"
          checked={allSelected}
          onChange={onToggleAll}
          label={copy.selectAll}
          className={styles.selectionControl}
        />
      ),
      width: NARROW_COLUMN_WIDTH,
      className: styles.selectionCell,
      render: (entry) => (
        <Checkbox
          name={`inbox-select-${entry.id}`}
          checked={selectedIds.has(entry.id)}
          onChange={(checked) => onToggleSelected(entry.id, checked)}
          label={`${copy.selectMessage}: ${entry.subject}`}
          className={styles.selectionControl}
        />
      ),
    },
    {
      id: "status",
      label: "",
      width: NARROW_COLUMN_WIDTH,
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
        navigationPrimary: true,
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

  const empty = <Text>{list.length === 0 ? copy.empty : copy.allRead}</Text>;

  return (
    <Stack id={INBOX_FEED_ID} tabIndex={-1} gap={8} className={styles.feed}>
      <Stack direction="row" gap={8} align="center">
        <Heading level={2}>{copy.heading}</Heading>
        <Text>
          {formatCount(unread, pluralForms.message)} {copy.unread}
        </Text>
      </Stack>
      <Stack direction="row" gap={4} wrap>
        <Checkbox
          name="inbox-unread-only"
          checked={unreadOnly}
          onChange={onUnreadOnlyChange}
          label={copy.unreadOnly}
          className={styles.filterCheckbox}
        />
        <Button onClick={() => onToggleSelectedRead(markRead)} disabled={selectedCount === 0}>
          {markRead ? copy.markAsRead : copy.markAsUnread}
        </Button>
        <Button onClick={onDeleteSelected} disabled={selectedCount === 0}>
          {copy.delete}
        </Button>
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
          highlightFocusedRow
        />
      )}
    </Stack>
  );
}
