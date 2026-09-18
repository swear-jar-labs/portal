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
import { PanelStack, ShellPanel, useLoginPrompt, useShellSession } from "@/features/shell";
import { stackMemory } from "@/shared/board/stack-memory";
import {
  FEED_PATH,
  threadPath,
  type BoardMember,
  type ThreadSummary,
} from "@/shared/board/threads";
import { avatarFor } from "@/shared/members";
import { ComposePanel } from "./ComposePanel";
import { composeButtonId, FeedPanel } from "./FeedPanel";
import { feedQueryParams, parseFeedQuery, type FeedQuery } from "./feed";
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
  return <ShellPanel title={fileTitle("DISCUSSIONS")}>{null}</ShellPanel>;
}

export function BoardStack({ threads, now, thread }: BoardStackProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [query, setQuery] = useState<FeedQuery>(() => parseFeedQuery(searchParams));
  const [composing, setComposing] = useState(false);
  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  // The control a closed layer owes focus to (the compose button, a new card).
  const returnFocusRef = useRef<string | null>(null);
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);

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
    if (stackMemory.wasPushedFrom(window.location.pathname)) router.back();
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

  const openCompose = useCallback(() => {
    gate(() => setComposing(true));
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
      closeCompose(threadCardId(id));
    },
    [addThread, author, closeCompose, requestLogin],
  );

  const closeTop = useCallback(() => {
    if (composing) {
      closeCompose();
      return;
    }
    if (openedLocalThread !== null) {
      closeLocalThread();
      return;
    }
    closeThread();
  }, [closeCompose, closeLocalThread, closeThread, composing, openedLocalThread]);

  return (
    <ThreadActionsProvider actions={threadActions}>
      <PanelStack onCloseTop={closeTop}>
        <ShellPanel title={fileTitle("DISCUSSIONS")} closable>
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
            <ComposePanel onSubmit={submitCompose} onCancel={() => closeCompose()} />
          </ShellPanel>
        ) : null}
      </PanelStack>
    </ThreadActionsProvider>
  );
}
