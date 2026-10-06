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

// Composed threads commit server-side with a real route, so the feed holds
// no session threads anymore; the panel prop stays (owned by the feed).
const EMPTY_THREAD_IDS: ReadonlySet<string> = new Set();

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
  // The control a closed layer owes focus to (the compose button, a new card).
  const returnFocusRef = useRef<string | null>(null);
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);

  const activeThreadId = thread?.id;

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
    composeThread,
  } = useBoardSession({
    threads,
    now,
    query,
    threadId: activeThreadId,
    corpus,
    moderation,
    viewer,
  });

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
  }, [thread?.id]);

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

  // The open thread's notify context: the layer's title and the summaries'
  // board. Absent off-thread (no notify target).
  const openTitle = thread?.title;
  const openBoard: BoardId | undefined =
    activeThreadId === undefined
      ? undefined
      : threads.find((entry) => entry.id === activeThreadId)?.board;

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
      const threadAuthor = summaryAuthor ?? corpusThread?.author.user;
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
    [author, corpus, openBoard, openTitle, state.threads, threads],
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
        const authorNow = author;
        const targetId = activeThreadId;
        void (async () => {
          const post = await addReply(body, authorNow, replyTo);
          if (post === undefined) return;
          notifyThreadMentions(post.id, body, targetId);
          notifyThreadReply(post.id, replyTo, targetId);
        })();
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
      // The root slot intercepts the thread above the current stack: the card
      // stays mounted and returns focus when the overlay peels.
      pushOverlay(threadPath(threadId), threadCardId(threadId))(event);
    },
    [pushOverlay],
  );

  const voteThread = useCallback(
    (threadId: string) => {
      gate(() => toggleThreadVote(threadId));
    },
    [gate, toggleThreadVote],
  );

  // A search jump: the title opens the thread at its head, a reply lands on
  // the post's anchor (focused and scrolled like a deep link).
  const jumpToMatch = useCallback(
    (threadId: string, postId: string | undefined, event?: MouseEvent<HTMLElement>) => {
      if (postId === undefined) {
        activateThread(threadId, event);
        return;
      }
      pushOverlay(`${threadPath(threadId)}${postHash(postId)}`, threadCardId(threadId))(event);
    },
    [activateThread, pushOverlay],
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
      const authorNow = author;
      void (async () => {
        const result = await composeThread(input);
        if (!result.ok) {
          if (result.error === "login-required") requestLogin();
          else console.warn("[board] thread not composed", result.error);
          return;
        }
        const id = result.id;
        // The opening post notifies under the thread id: one root post per
        // thread, so the id stays a stable per-message key. Its context is
        // the composed thread itself, not the open one.
        notifyMentions({
          authorUser: authorNow.user,
          messageId: id,
          body: input.body,
          source: boardTitle(input.board),
          context: input.title,
          target: { kind: "thread", label: input.title, href: threadPath(id) },
        });
        // The new card must be visible: the submit moves the feed to its board
        // and drops any text query that would hide it, then opens the thread
        // at its fresh route.
        setQuery({ board: input.board, sort: "new", q: "" });
        closeCompose(threadCardId(id));
        pushOverlay(threadPath(id), threadCardId(id))();
      })();
    },
    [author, closeCompose, composeThread, notifyMentions, pushOverlay, requestLogin],
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
    closeThread();
  }, [closeCompose, closeOverlay, closeThread, composing, overlayOpen]);

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
            localThreadIds={EMPTY_THREAD_IDS}
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
