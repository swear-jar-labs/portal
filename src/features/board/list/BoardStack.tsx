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
import { isThreadHidden, useModeration } from "@/features/moderation/contracts";
import {
  overlayLayerPanels,
  PanelStack,
  ShellPanel,
  stackMemory,
  useLoginPrompt,
  useOverlayPush,
  useOverlayTop,
  useShellSession,
} from "@/features/shell";
import {
  composableBoardIds,
  FEED_PATH,
  boardTitle,
  threadPath,
  type BoardId,
  type BoardMember,
  type BoardOption,
  type Thread,
  type ThreadSummary,
} from "../model/threads";
import { avatarFor } from "@/shared/members";
import {
  buildReplyEvents,
  enqueueInboxEvent,
  useMentionNotifier,
} from "@/features/inbox/contracts";
import { ComposePanel } from "../compose/ComposePanel";
import { composeButtonId, FeedPanel } from "./FeedPanel";
import { feedQueryParams, parseFeedQuery, sameFeedQuery, type FeedQuery } from "../model/feed";
import { postElementId, postHash, postIdFromHash } from "../model/post-anchor";
import type { ComposeInput } from "../model/schema";
import { ThreadActionsProvider, type ThreadActions } from "../data/thread-actions";
import { threadCardId } from "./ThreadCard";
import { ThreadView } from "../detail/ThreadView";
import { useBoardSession } from "../data/useBoardSession";

export type BoardThreadLayer = {
  id: string;
  title: string;
  // The thread's panel body, rendered in RSC (Markdown stays out of the client
  // bundle) and slotted into the panel chrome here.
  layer: ReactNode;
};

export type BoardStackProps = {
  threads: readonly ThreadSummary[];
  // The ranking base captured by the RSC render: server and client sort
  // identically at hydration.
  now: string;
  // Full fixture threads for the mock search: the session merges its
  // composed threads, replies, edits and deletions over them.
  corpus: readonly Thread[];
  thread?: BoardThreadLayer;
  projectBoards?: readonly BoardOption[];
};

/** The feed panel before the URL filters are known (the Suspense fallback). */
export function BoardFallback() {
  return <ShellPanel title={fileTitle("FORUM")}>{null}</ShellPanel>;
}

export function BoardStack({ threads, now, corpus, thread, projectBoards = [] }: BoardStackProps) {
  const moderation = useModeration();
  const router = useRouter();
  const pushOverlay = useOverlayPush();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  // The search's view of the actor: hidden material drops out for anyone but
  // admins and the material's own author.
  const viewer = useMemo(
    () => (session === null ? null : { user: session.user, admin: session.admin === true }),
    [session],
  );
  const allowedBoards = [...composableBoardIds, ...projectBoards.map((board) => board.id)];
  const [query, setQuery] = useState<FeedQuery>(() => parseFeedQuery(searchParams, allowedBoards));
  // The last search the state was synced from: UI-driven edits rewrite the URL
  // with replaceState (the router never reports those back), so only a new
  // search string resyncs — a section entry (ERRATA) or history step.
  const [syncedSearch, setSyncedSearch] = useState(() => searchParams.toString());
  const liveSearch = searchParams.toString();
  // Render-adjust, like the file cursor: no effect, no cascading subscription.
  if (syncedSearch !== liveSearch) {
    setSyncedSearch(liveSearch);
    const next = parseFeedQuery(searchParams, allowedBoards);
    if (!sameFeedQuery(query, next)) setQuery(next);
  }
  const initialCompose =
    searchParams.get("new") === "1" &&
    query.board !== undefined &&
    (composableBoardIds.some((board) => board === query.board) ||
      projectBoards.some((board) => board.id === query.board && !board.archived));
  const [composing, setComposing] = useState(initialCompose);
  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  // The control a closed layer owes focus to (the compose button, a new card).
  const returnFocusRef = useRef<string | null>(null);
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  const activeThreadId = thread?.id ?? localThreadId ?? undefined;

  const {
    state,
    visible,
    searchHits,
    threadState,
    pinned,
    locked,
    toggleThreadVote,
    togglePostVote,
    editPost,
    deletePost,
    togglePin,
    toggleLock,
    addReply,
    addThread,
  } = useBoardSession({
    threads,
    now,
    query,
    threadId: activeThreadId,
    corpus,
    moderation,
    viewer,
  });

  const openedLocalThread = useMemo(
    () => state.addedThreads.find((entry) => entry.id === localThreadId) ?? null,
    [localThreadId, state.addedThreads],
  );

  const localThreadIds = useMemo(
    () => new Set(state.addedThreads.map((entry) => entry.id)),
    [state.addedThreads],
  );

  // A new top layer (or the feed) ends the close that was in flight.
  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers, thread?.id]);

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

  // After a layer pops, focus returns to the card that opened it: the request
  // crosses the page remount in the SPA session memory, and a local close
  // (state change, no route) runs the same effect. A deep link's post hash
  // comes second: the return of focus owns the keyboard, the anchor the view.
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (id) {
      const card = document.getElementById(threadCardId(id));
      card?.focus();
      card?.scrollIntoView({ block: "nearest" });
      return;
    }
    const postId = postIdFromHash(window.location.hash);
    if (postId === undefined) return;
    const post = document.getElementById(postElementId(postId));
    post?.focus();
    post?.scrollIntoView({ block: "center" });
  }, [localThreadId]);

  // The compose layer hands focus back to the control that opened it (or to the
  // card it just created). A card hidden by the active filters falls back to
  // the compose button.
  useEffect(() => {
    if (composing) return;
    const id = returnFocusRef.current;
    if (id === null) return;
    returnFocusRef.current = null;
    const target = document.getElementById(id) ?? document.getElementById(composeButtonId);
    target?.focus();
  }, [composing]);

  // The guest gate: an action that needs a member prompts for logon instead.
  const gate = useCallback(
    (action: () => void) => {
      if (session === null) {
        requestLogin();
        return;
      }
      action();
    },
    [requestLogin, session],
  );

  const author = useMemo<BoardMember | null>(
    () =>
      session === null
        ? null
        : { user: session.user, role: "member", avatar: avatarFor(session.user) },
    [session],
  );

  const notifyMentions = useMentionNotifier();

  // The open thread's notify context: the fixture layer's title, the session
  // thread's facts, the summaries' board. Absent off-thread (no notify target).
  const openTitle =
    thread !== undefined && thread.id === activeThreadId ? thread.title : openedLocalThread?.title;
  const openBoard: BoardId | undefined =
    activeThreadId === undefined
      ? undefined
      : (openedLocalThread?.board ?? threads.find((entry) => entry.id === activeThreadId)?.board);

  const notifyThreadMentions = useCallback(
    (messageId: string, body: string, targetId: string) => {
      if (author === null || openTitle === undefined || openBoard === undefined) return;
      notifyMentions({
        authorUser: author.user,
        messageId,
        body,
        source: boardTitle(openBoard),
        context: openTitle,
        target: { kind: "thread", label: openTitle, href: threadPath(targetId) },
      });
    },
    [author, notifyMentions, openBoard, openTitle],
  );

  const notifyThreadReply = useCallback(
    (postId: string, replyTo: string | undefined, targetId: string) => {
      if (author === null || openTitle === undefined || openBoard === undefined) return;
      const summaryAuthor = threads.find((entry) => entry.id === targetId)?.author.user;
      const corpusThread = corpus.find((entry) => entry.id === targetId);
      const threadAuthor =
        openedLocalThread?.id === targetId
          ? openedLocalThread.author.user
          : (summaryAuthor ?? corpusThread?.author.user);
      const fixtureParent = corpusThread?.posts.find((post) => post.id === replyTo);
      const sessionParent = state.threads[targetId]?.addedPosts.find((post) => post.id === replyTo);
      const parentAuthor = fixtureParent?.author.user ?? sessionParent?.author.user;
      const at = new Date().toISOString();
      for (const delivery of buildReplyEvents({
        postId,
        threadTitle: openTitle,
        boardLabel: boardTitle(openBoard),
        actorUser: author.user,
        actorName: author.user,
        threadAuthor,
        parentAuthor,
        target: { kind: "thread", label: openTitle, href: threadPath(targetId) },
        at,
      }))
        enqueueInboxEvent(delivery.user, delivery.event);
    },
    [author, corpus, openBoard, openTitle, openedLocalThread, state.threads, threads],
  );

  const threadActions = useMemo<ThreadActions | null>(() => {
    if (activeThreadId === undefined) return null;
    // Pin/lock belong to admins alone: the controls hide for anyone else,
    // and the transitions below no-op without the admin bit.
    const admin = session?.admin === true;
    return {
      state: threadState,
      votedThread: state.votedThreads.has(activeThreadId),
      pinned,
      locked,
      canModerate: admin,
      onToggleThreadVote: () => gate(() => toggleThreadVote(activeThreadId)),
      onTogglePostVote: (postId) => gate(() => togglePostVote(postId)),
      onEditPost: (postId, body) => {
        editPost(postId, body);
        if (activeThreadId !== undefined) notifyThreadMentions(postId, body, activeThreadId);
      },
      onDeletePost: deletePost,
      onTogglePin: () => {
        if (admin) togglePin();
      },
      onToggleLock: () => {
        if (admin) toggleLock();
      },
      onReply: (body, replyTo) => {
        if (author === null || activeThreadId === undefined) return;
        const post = addReply(body, author, replyTo);
        if (post !== undefined) {
          notifyThreadMentions(post.id, body, activeThreadId);
          notifyThreadReply(post.id, replyTo, activeThreadId);
        }
      },
    };
  }, [
    activeThreadId,
    addReply,
    author,
    deletePost,
    editPost,
    gate,
    locked,
    notifyThreadMentions,
    notifyThreadReply,
    pinned,
    session?.admin,
    state.votedThreads,
    threadState,
    toggleLock,
    togglePin,
    togglePostVote,
    toggleThreadVote,
  ]);

  const applyQuery = useCallback((patch: Partial<FeedQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const activateThread = useCallback(
    (threadId: string, event?: MouseEvent<HTMLElement>) => {
      // A composed thread has no route to navigate to (and no link in its card):
      // it opens in place. Keep the native behavior for real routes.
      if (state.addedThreads.some((entry) => entry.id === threadId)) {
        setLocalThreadId(threadId);
        return;
      }
      // The root slot intercepts the thread above the current stack: the card
      // stays mounted and returns focus when the overlay peels.
      pushOverlay(threadPath(threadId), threadCardId(threadId))(event);
    },
    [pushOverlay, state.addedThreads],
  );

  const voteThread = useCallback(
    (threadId: string) => {
      gate(() => toggleThreadVote(threadId));
    },
    [gate, toggleThreadVote],
  );

  // A search jump: the title opens the thread at its head, a reply lands on
  // the post's anchor (focused and scrolled like a deep link). Session threads
  // have no route, so they open in place with the hash set first — the feed
  // effect below picks it up.
  const jumpToMatch = useCallback(
    (threadId: string, postId: string | undefined, event?: MouseEvent<HTMLElement>) => {
      if (postId === undefined) {
        activateThread(threadId, event);
        return;
      }
      if (state.addedThreads.some((entry) => entry.id === threadId)) {
        if (threadId === localThreadId) {
          const post = document.getElementById(postElementId(postId));
          post?.focus();
          post?.scrollIntoView({ block: "center" });
          return;
        }
        window.history.replaceState(window.history.state, "", postHash(postId));
        setLocalThreadId(threadId);
        return;
      }
      pushOverlay(`${threadPath(threadId)}${postHash(postId)}`, threadCardId(threadId))(event);
    },
    [activateThread, localThreadId, pushOverlay, state.addedThreads],
  );

  const closeThread = useCallback(() => {
    if (!thread) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(thread.id);
    // Direct-load only (an overlay thread peels with browser back instead):
    // only the route we pushed has the feed behind it in history; a
    // deep-linked thread (or one history walked back to) closes by pushing
    // the feed with the current filters, so a search result returns to its
    // results.
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else {
      const params = feedQueryParams(query);
      const search = params.toString();
      router.push(search ? `${FEED_PATH}?${search}` : FEED_PATH);
    }
  }, [query, router, thread]);

  const closeLocalThread = useCallback(() => {
    if (openedLocalThread === null) return;
    stackMemory.requestCardFocus(openedLocalThread.id);
    // The hash of a jump inside the local thread dies with it: the feed must
    // not keep an anchor to a layer that is gone.
    if (window.location.hash !== "") {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setLocalThreadId(null);
  }, [openedLocalThread]);

  const openCompose = useCallback(() => {
    gate(() => {
      setComposing(true);
    });
  }, [gate]);

  const closeCompose = useCallback((focusId: string = composeButtonId) => {
    returnFocusRef.current = focusId;
    setComposing(false);
  }, []);

  const submitCompose = useCallback(
    (input: ComposeInput) => {
      if (author === null) {
        requestLogin();
        return;
      }
      const id = addThread(input, author);
      // The opening post notifies under the thread id: one root post per
      // thread, so the id stays a stable per-message key. Its context is the
      // composed thread itself, not the open one.
      notifyMentions({
        authorUser: author.user,
        messageId: id,
        body: input.body,
        source: boardTitle(input.board),
        context: input.title,
        target: { kind: "thread", label: input.title, href: threadPath(id) },
      });
      // The new card must be visible: the submit moves the feed to its board
      // and drops any text query that would hide it.
      setQuery({ board: input.board, sort: "new", q: "" });
      closeCompose(threadCardId(id));
    },
    [addThread, author, closeCompose, notifyMentions, requestLogin],
  );

  const closeTop = useCallback(() => {
    if (overlayOpen) {
      closeOverlay();
      return;
    }
    if (composing) {
      closeCompose();
      return;
    }
    if (openedLocalThread !== null) {
      closeLocalThread();
      return;
    }
    closeThread();
  }, [
    closeCompose,
    closeLocalThread,
    closeOverlay,
    closeThread,
    composing,
    openedLocalThread,
    overlayOpen,
  ]);

  return (
    <ThreadActionsProvider actions={threadActions}>
      <PanelStack onCloseTop={closeTop} searchable>
        <ShellPanel title={fileTitle("FORUM")}>
          <FeedPanel
            threads={visible}
            now={now}
            query={query}
            currentThreadId={activeThreadId}
            votedThreadIds={state.votedThreads}
            localThreadIds={localThreadIds}
            searchHits={searchHits}
            onQueryChange={applyQuery}
            onActivateThread={activateThread}
            onJumpToMatch={jumpToMatch}
            onVoteThread={voteThread}
            onCompose={openCompose}
            projectBoards={projectBoards}
          />
        </ShellPanel>
        {thread ? (
          <ShellPanel
            title={
              isThreadHidden(moderation, thread.id) &&
              !session?.admin &&
              session?.user !== threads.find((item) => item.id === thread.id)?.author.user
                ? messages.moderation.hiddenThread
                : thread.title
            }
            actions={<CloseButton onClose={closeThread} label={messages.shell.window.closeLabel} />}
          >
            {thread.layer}
          </ShellPanel>
        ) : null}
        {openedLocalThread ? (
          <ShellPanel
            title={
              isThreadHidden(moderation, openedLocalThread.id) &&
              !session?.admin &&
              session?.user !== openedLocalThread.author.user
                ? messages.moderation.hiddenThread
                : openedLocalThread.title
            }
            actions={
              <CloseButton onClose={closeLocalThread} label={messages.shell.window.closeLabel} />
            }
          >
            <ThreadView thread={openedLocalThread} now={now} />
          </ShellPanel>
        ) : null}
        {composing ? (
          <ShellPanel
            title={messages.board.compose.title}
            surface="light"
            actions={
              <CloseButton
                onClose={() => closeCompose()}
                label={messages.shell.window.closeLabel}
              />
            }
          >
            <ComposePanel
              defaultBoard={query.board}
              projectBoards={projectBoards}
              onSubmit={submitCompose}
              onCancel={() => closeCompose()}
            />
          </ShellPanel>
        ) : null}
        {overlayLayerPanels(overlayLayers, closeOverlay)}
      </PanelStack>
    </ThreadActionsProvider>
  );
}
