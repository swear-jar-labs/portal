"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { overlayLayerPanels, PanelStack, ShellPanel, useOverlayTop } from "@/features/shell";
import { InboxDetail } from "./InboxDetail";
import { InboxFeed } from "./InboxFeed";
import {
  deleteInboxSelected,
  markInboxRead,
  setInboxSelectedRead,
  useInboxSession,
} from "./inbox-store";
import {
  INBOX_FEED_ID,
  inboxRowId,
  visibleInboxNotifications,
  type InboxNotification,
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
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const closingRef = useRef(false);
  const returnFocusRef = useRef<string | null>(null);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers, selectedId]);

  const visible = useMemo(() => visibleInboxNotifications(list, unreadOnly), [list, unreadOnly]);
  const visibleIds = useMemo(() => visible.map((entry) => entry.id), [visible]);
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

  // A read message can leave the unread projection while its detail stays open.
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

  const toggleSelected = useCallback((id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(visibleIds) : new Set());
    },
    [visibleIds],
  );

  const selectedVisibleIds = visibleIds.filter((id) => selectedIds.has(id));

  const finishBulkAction = useCallback(() => {
    setSelectedIds(new Set());
    document.getElementById(INBOX_FEED_ID)?.focus();
  }, []);

  const toggleSelectedRead = useCallback(
    (read: boolean) => {
      setInboxSelectedRead(user, selectedVisibleIds, read);
      finishBulkAction();
    },
    [finishBulkAction, selectedVisibleIds, user],
  );

  const deleteSelected = useCallback(() => {
    deleteInboxSelected(user, selectedVisibleIds);
    if (selectedId !== null && selectedVisibleIds.includes(selectedId)) {
      returnFocusRef.current = null;
      setSelectedId(null);
    }
    finishBulkAction();
  }, [finishBulkAction, selectedId, selectedVisibleIds, user]);

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
          unreadOnly={unreadOnly}
          selectedId={selectedId}
          selectedIds={selectedIds}
          now={now}
          onUnreadOnlyChange={(value) => {
            setUnreadOnly(value);
            setSelectedIds(new Set());
          }}
          onSelect={select}
          onToggleSelected={toggleSelected}
          onToggleAll={toggleAll}
          onToggleSelectedRead={toggleSelectedRead}
          onDeleteSelected={deleteSelected}
        />
      </ShellPanel>
      {selected ? (
        <ShellPanel
          title={selected.target.label}
          actions={<CloseButton onClose={closeDetail} label={messages.shell.window.closeLabel} />}
        >
          <InboxDetail entry={selected} />
        </ShellPanel>
      ) : null}
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
