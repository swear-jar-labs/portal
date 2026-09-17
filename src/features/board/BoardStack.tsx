"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { PanelStack, ShellPanel } from "@/features/shell";
import { stackMemory } from "@/shared/board/stack-memory";
import { FEED_PATH, threadPath, type ThreadSummary } from "@/shared/board/threads";
import { FeedPanel } from "./FeedPanel";
import {
  feedQueryParams,
  filterThreads,
  parseFeedQuery,
  rankThreads,
  type FeedQuery,
} from "./feed";
import { threadCardId } from "./ThreadCard";

export type BoardThreadLayer = {
  id: string;
  title: string;
  // The thread's post list, rendered in RSC (Markdown stays out of the client
  // bundle) and slotted into the panel chrome here.
  layer: ReactNode;
};

export type BoardStackProps = {
  threads: readonly ThreadSummary[];
  // The ranking base captured by the RSC render: server and client sort
  // identically at hydration.
  now: string;
  thread?: BoardThreadLayer;
};

/** The feed panel before the URL filters are known (the Suspense fallback). */
export function BoardFallback() {
  return <ShellPanel title={fileTitle("DISCUSSIONS")}>{null}</ShellPanel>;
}

export function BoardStack({ threads, now, thread }: BoardStackProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<FeedQuery>(() => parseFeedQuery(searchParams));
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);

  // A new thread (or the feed) ends the close that was in flight.
  useEffect(() => {
    closingRef.current = false;
  }, [thread?.id]);

  // Filters are client state; the URL keeps the feed deep-linkable without an
  // RSC refetch — replaceState rewrites the address only.
  useEffect(() => {
    if (pathname !== FEED_PATH) return;
    const params = feedQueryParams(query);
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      search ? `${FEED_PATH}?${search}` : FEED_PATH,
    );
  }, [pathname, query]);

  // After the layer pops, focus returns to the card that opened the thread: the
  // request crosses the page remount in the SPA session memory.
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (!id) return;
    const card = document.getElementById(threadCardId(id));
    card?.focus();
    card?.scrollIntoView({ block: "nearest" });
  }, []);

  const visible = useMemo(
    () => rankThreads(filterThreads(threads, query), query.sort, Date.parse(now)),
    [now, query, threads],
  );

  const applyQuery = useCallback((patch: Partial<FeedQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const activateThread = useCallback(
    (threadId: string, event?: MouseEvent<HTMLElement>) => {
      // Modified clicks and the middle button keep the native behavior (new tab).
      if (!isPlainActivation(event)) return;
      event?.preventDefault();
      const route = threadPath(threadId);
      stackMemory.rememberPush(route);
      router.push(route);
    },
    [router],
  );

  const closeThread = useCallback(() => {
    if (!thread) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(thread.id);
    // Only the route we pushed has the feed behind it in history; a deep-linked
    // thread (or one history walked back to) closes by pushing the feed.
    if (stackMemory.wasPushedFrom(window.location.pathname)) router.back();
    else router.push(FEED_PATH);
  }, [router, thread]);

  return (
    <PanelStack onCloseTop={closeThread}>
      <ShellPanel title={fileTitle("DISCUSSIONS")} closable>
        <FeedPanel
          threads={visible}
          now={now}
          query={query}
          currentThreadId={thread?.id}
          onQueryChange={applyQuery}
          onActivateThread={activateThread}
        />
      </ShellPanel>
      {thread ? (
        <ShellPanel
          title={thread.title}
          surface="light"
          actions={<CloseButton onClose={closeThread} label={messages.shell.window.closeLabel} />}
        >
          {thread.layer}
        </ShellPanel>
      ) : null}
    </PanelStack>
  );
}
