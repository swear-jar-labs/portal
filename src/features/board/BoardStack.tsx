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
import {
  PanelStack,
  ShellPanel,
  stackMemory,
  useLoginPrompt,
  useShellSession,
} from "@/features/shell";
import { useMemberLayer } from "@/features/members/contracts";
import {
  composableBoardIds,
  FEED_PATH,
  threadPath,
  type BoardMember,
  type ThreadSummary,
} from "./threads";
import { avatarFor } from "@/shared/members";
import { ComposePanel } from "./ComposePanel";
import { composeButtonId, FeedPanel } from "./FeedPanel";
import { feedQueryParams, parseFeedQuery, sameFeedQuery, type FeedQuery } from "./feed";
import { postElementId, postIdFromHash } from "./post-anchor";
import type { ComposeInput } from "./schema";
import { ThreadActionsProvider, type ThreadActions } from "./thread-actions";
import { threadCardId } from "./ThreadCard";
import { ThreadView } from "./ThreadView";
import { useBoardSession } from "./useBoardSession";

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
  thread?: BoardThreadLayer;
};

/** The feed panel before the URL filters are known (the Suspense fallback). */
export function BoardFallback() {
  return <ShellPanel title={fileTitle("FORUM")}>{null}</ShellPanel>;
}

export function BoardStack({ threads, now, thread }: BoardStackProps) {
  const router = useRouter();
  const pathname = usePathname();
  const routedMemberLayer = useMemberLayer();
  const searchParams = useSearchParams();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [query, setQuery] = useState<FeedQuery>(() => parseFeedQuery(searchParams));
  // The last search the state was synced from: UI-driven edits rewrite the URL
  // with replaceState (the router never reports those back), so only a new
  // search string resyncs — a section entry (ERRATA) or history step.
  const [syncedSearch, setSyncedSearch] = useState(() => searchParams.toString());
  const liveSearch = searchParams.toString();
  // Render-adjust, like the file cursor: no effect, no cascading subscription.
  if (syncedSearch !== liveSearch) {
    setSyncedSearch(liveSearch);
    const next = parseFeedQuery(searchParams);
    if (!sameFeedQuery(query, next)) setQuery(next);
  }
  const initialCompose =
    searchParams.get("new") === "1" &&
    query.board !== undefined &&
    composableBoardIds.some((board) => board === query.board);
  const [composing, setComposing] = useState(initialCompose);
  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  // The control a closed layer owes focus to (the compose button, a new card).
  const returnFocusRef = useRef<string | null>(null);
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  const memberLayerOpen = routedMemberLayer !== null;
  const wasMemberLayerOpen = useRef(memberLayerOpen);

  const activeThreadId = thread?.id ?? localThreadId ?? undefined;

  const {
    state,
    visible,
    threadState,
    toggleThreadVote,
    togglePostVote,
    editPost,
    deletePost,
    addReply,
    addThread,
  } = useBoardSession({ threads, now, query, threadId: activeThreadId });

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
  }, [memberLayerOpen, thread?.id]);

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

  // Unlike a thread route, an intercepted profile keeps this BoardStack and
  // its author link mounted. The known id can therefore receive focus as soon
  // as the profile slot disappears.
  useEffect(() => {
    const closed = !memberLayerOpen && wasMemberLayerOpen.current;
    wasMemberLayerOpen.current = memberLayerOpen;
    if (!closed) return;
    const id = stackMemory.takePendingMemberFocus();
    if (id) document.getElementById(id)?.focus();
  }, [memberLayerOpen]);

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

  const threadActions = useMemo<ThreadActions | null>(() => {
    if (activeThreadId === undefined) return null;
    return {
      state: threadState,
      votedThread: state.votedThreads.has(activeThreadId),
      onToggleThreadVote: () => gate(() => toggleThreadVote(activeThreadId)),
      onTogglePostVote: (postId) => gate(() => togglePostVote(postId)),
      onEditPost: editPost,
      onDeletePost: deletePost,
      onReply: (body, replyTo) => {
        if (author !== null) addReply(body, author, replyTo);
      },
    };
  }, [
    activeThreadId,
    addReply,
    author,
    deletePost,
    editPost,
    gate,
    state.votedThreads,
    threadState,
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
      if (!isPlainActivation(event)) return;
      event?.preventDefault();
      const route = threadPath(threadId);
      stackMemory.rememberPush(route);
      router.push(route);
    },
    [router, state.addedThreads],
  );

  const voteThread = useCallback(
    (threadId: string) => {
      gate(() => toggleThreadVote(threadId));
    },
    [gate, toggleThreadVote],
  );

  const closeThread = useCallback(() => {
    if (!thread) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(thread.id);
    // Only the route we pushed has the feed behind it in history; a deep-linked
    // thread (or one history walked back to) closes by pushing the feed.
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else router.push(FEED_PATH);
  }, [router, thread]);

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

  const closeMember = useCallback(() => {
    if (!memberLayerOpen) return;
    if (closingRef.current) return;
    closingRef.current = true;
    // An intercepted profile is only reached from a plain in-app activation.
    // A fallback preserves the thread when an unusual router history omits it.
    if (stackMemory.wasMemberPushedFrom(window.location.pathname)) router.back();
    else router.push(thread ? threadPath(thread.id) : FEED_PATH);
  }, [memberLayerOpen, router, thread]);

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
      setQuery({ board: input.board, sort: "new" });
      closeCompose(threadCardId(id));
    },
    [addThread, author, closeCompose, requestLogin],
  );

  const closeTop = useCallback(() => {
    if (memberLayerOpen) {
      closeMember();
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
    closeMember,
    closeThread,
    composing,
    memberLayerOpen,
    openedLocalThread,
  ]);

  return (
    <ThreadActionsProvider actions={threadActions}>
      <PanelStack onCloseTop={closeTop}>
        <ShellPanel title={fileTitle("FORUM")} closable>
          <FeedPanel
            threads={visible}
            now={now}
            query={query}
            currentThreadId={activeThreadId}
            votedThreadIds={state.votedThreads}
            localThreadIds={localThreadIds}
            onQueryChange={applyQuery}
            onActivateThread={activateThread}
            onVoteThread={voteThread}
            onCompose={openCompose}
          />
        </ShellPanel>
        {thread ? (
          <ShellPanel
            title={thread.title}
            actions={<CloseButton onClose={closeThread} label={messages.shell.window.closeLabel} />}
          >
            {thread.layer}
          </ShellPanel>
        ) : null}
        {openedLocalThread ? (
          <ShellPanel
            title={openedLocalThread.title}
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
              onSubmit={submitCompose}
              onCancel={() => closeCompose()}
            />
          </ShellPanel>
        ) : null}
        {memberLayerOpen ? (
          <ShellPanel
            title={messages.members.panelTitle}
            actions={<CloseButton onClose={closeMember} label={messages.shell.window.closeLabel} />}
          >
            {routedMemberLayer}
          </ShellPanel>
        ) : null}
      </PanelStack>
    </ThreadActionsProvider>
  );
}
