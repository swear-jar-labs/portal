"use client";

import { useRouter } from "next/navigation";
import { FileIcon, Link, Text } from "@swearjar/dos";
import { INBOX_PATH } from "@/content/commands";
import { messages } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { useInboxSession } from "./inbox-store";
import type { InboxNotification } from "./inbox";
import styles from "./InboxStatusAddon.module.css";

export type InboxStatusAddonProps = {
  user: string;
  seed: readonly InboxNotification[];
};

// The unread counter composed into the shell chrome by the layout: the shell
// owns the slot, this component owns the data, so no shell → inbox import
// exists. Silent when there is nothing unread.
export function InboxStatusAddon({ user, seed }: InboxStatusAddonProps) {
  const router = useRouter();
  const { unread } = useInboxSession(user, seed);
  if (unread === 0) return null;
  return (
    <Text as="span" className={styles.trayItem}>
      <Link
        href={INBOX_PATH}
        className={styles.trayLink}
        onClick={(event) => {
          if (!isPlainActivation(event)) return;
          event?.preventDefault();
          router.push(INBOX_PATH);
        }}
      >
        <span className={styles.trayIcon} role="img" aria-label={messages.inbox.badge}>
          <FileIcon kind="exe" icon="mail" />
        </span>
        <span>{unread}</span>
      </Link>
    </Text>
  );
}

export function InboxFileIcon({ user, seed }: InboxStatusAddonProps) {
  const { unread } = useInboxSession(user, seed);
  return <FileIcon kind="exe" icon={unread > 0 ? "mailUnread" : "mail"} />;
}
