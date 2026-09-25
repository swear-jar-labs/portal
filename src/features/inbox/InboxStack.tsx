"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { overlayLayerPanels, PanelStack, ShellPanel, useOverlayTop } from "@/features/shell";
import { InboxDetail } from "./InboxDetail";
import { InboxFeed } from "./InboxFeed";
import {
  archiveInbox,
  markAllInboxRead,
  markInboxRead,
  markInboxUnread,
  restoreInbox,
  useInboxSession,
} from "./inbox-store";
import {
  INBOX_FEED_ID,
  inboxRowId,
  visibleInboxNotifications,
  type InboxNotification,
  type InboxView,
} from "./inbox";

export type InboxStackProps = {
  user: string;
  seed: readonly InboxNotification[];
  now: string;
};

// The mail client: the list and the open message are two layers of one
// section stack, so the narrow layout walks list → message and back. Opening
// a message marks it read; the header counter and the list read the same
// session selection. Target layers (ticket, thread, readroom) arrive through
// the root overlay slot owned by this stack.
export function InboxStack({ user, seed, now }: InboxStackProps) {
  const { list, unread } = useInboxSession(user, seed);
  const [view, setView] = useState<InboxView>("inbox");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closingRef = useRef(false);
  const returnFocusRef = useRef<string | null>(null);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers, selectedId, view]);

  const visible = useMemo(
    () => visibleInboxNotifications(list, view, unreadOnly),
    [list, view, unreadOnly],
  );
  const archivedCount = useMemo(() => list.filter((entry) => entry.archived).length, [list]);
  const selected = useMemo(
    () => list.find((entry) => entry.id === selectedId) ?? null,
    [list, selectedId],
  );

  useEffect(() => {
    if (selectedId !== null) return;
    const id = returnFocusRef.current;
    if (id === null) return;
    returnFocusRef.current = null;
    (document.getElementById(id) ?? document.getElementById(INBOX_FEED_ID))?.focus();
  }, [selectedId]);

  // A selection that leaves the current projection (archived from the
  // detail, filtered out) keeps its layer: the detail owns its entry.
  const select = useCallback(
    (id: string) => {
      returnFocusRef.current = inboxRowId(id);
      markInboxRead(user, id);
      setSelectedId(id);
    },
    [user],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const closeTop = useCallback(() => {
    if (overlayOpen) {
      closeOverlay();
      return;
    }
    if (selected !== null) closeDetail();
  }, [closeDetail, closeOverlay, overlayOpen, selected]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("INBOX")} closable>
        <InboxFeed
          list={list}
          visible={visible}
          unread={unread}
          archivedCount={archivedCount}
          view={view}
          unreadOnly={unreadOnly}
          selectedId={selectedId}
          now={now}
          onViewChange={setView}
          onUnreadOnlyChange={setUnreadOnly}
          onSelect={select}
          onMarkAllRead={() => markAllInboxRead(user)}
        />
      </ShellPanel>
      {selected ? (
        <ShellPanel
          title={selected.target.label}
          actions={<CloseButton onClose={closeDetail} label={messages.shell.window.closeLabel} />}
        >
          <InboxDetail
            entry={selected}
            onMarkRead={() => markInboxRead(user, selected.id)}
            onMarkUnread={() => markInboxUnread(user, selected.id)}
            onArchive={() => archiveInbox(user, selected.id)}
            onRestore={() => restoreInbox(user, selected.id)}
          />
        </ShellPanel>
      ) : null}
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
