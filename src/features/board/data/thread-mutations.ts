import * as boardStore from "./board-store";
import * as boardActions from "./board-actions";
import type { BoardMember, ThreadPost } from "../model/threads";

// The board's client-side mutation sync, shared by the feed hook and the
// overlay provider (one implementation, not two). Every mutation applies
// its session delta first and syncs the server action behind it:
//
// - votes settle by dropping the local +1 either way: on success the
//   revalidated server count already includes the vote (keeping the delta
//   would count it twice), on failure nothing was written;
// - deletes settle by dropping the session tombstone either way: on
//   success the revalidated thread carries the server tombstone (keeping
//   the delta would subtract the reply twice from the card count);
// - edits keep their override on success (it matches the stored body) and
//   roll back to the previous override on failure;
// - replies commit server-first (their ids are real), and the merges drop
//   confirmed posts the server already echoes by id.

function warnNotSaved(what: string, error: string): void {
  console.warn(`[board] ${what} not saved`, error);
}

export function syncThreadVote(threadId: string): void {
  boardStore.toggleThreadVote(threadId);
  void boardActions.toggleThreadVote(threadId).then((result) => {
    boardStore.toggleThreadVote(threadId);
    if (!result.ok) warnNotSaved("thread vote", result.error);
  });
}

export function syncPostVote(threadId: string, postId: string): void {
  boardStore.togglePostVote(threadId, postId);
  void boardActions.togglePostVote(postId).then((result) => {
    boardStore.togglePostVote(threadId, postId);
    if (!result.ok) warnNotSaved("post vote", result.error);
  });
}

export function syncPostEdit(threadId: string, postId: string, body: string): void {
  const previous = boardStore.threadStateOf(boardStore.boardSnapshot(), threadId).edits.get(postId);
  boardStore.editPost(threadId, postId, body);
  void boardActions.editPost(postId, { body }).then((result) => {
    if (result.ok) return;
    if (previous === undefined) boardStore.clearPostEdit(threadId, postId);
    else boardStore.editPost(threadId, postId, previous);
    warnNotSaved("edit", result.error);
  });
}

export function syncPostDelete(threadId: string, postId: string): void {
  boardStore.deletePost(threadId, postId);
  void boardActions.deletePost(postId).then((result) => {
    boardStore.restorePost(threadId, postId);
    if (!result.ok) warnNotSaved("delete", result.error);
  });
}

export async function commitReply(
  threadId: string,
  author: BoardMember,
  body: string,
  replyTo: string | undefined,
): Promise<ThreadPost | undefined> {
  const result = await boardActions.replyToThread(threadId, {
    body,
    ...(replyTo === undefined ? {} : { replyTo }),
  });
  if (!result.ok) {
    warnNotSaved("reply", result.error);
    return undefined;
  }
  const post: ThreadPost = {
    id: result.id,
    author,
    body,
    ...(replyTo === undefined ? {} : { replyTo }),
    createdAt: result.createdAt ?? new Date().toISOString(),
    votes: 0,
  };
  boardStore.addConfirmedPost(threadId, post);
  return post;
}
