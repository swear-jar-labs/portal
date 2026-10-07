import * as boardStore from "./board-store";
import * as boardActions from "./board-actions";
import type { BoardMember, ThreadPost } from "../model/threads";

// The board's client-side mutation sync, shared by the feed hook and the
// overlay provider (one implementation, not two). Every mutation applies
// its session delta first and syncs the server action behind it:
//
// - thread votes stage their intent first (an up-vote stages +1, an unvote
//   stages −1, read from the displayed pressed state) and roll back only on
//   failure; on success the staged intent stays — the revalidated server
//   tally and voted flag absorb it through the display formula, whichever
//   lands first, the settle or the revalidation. The pressed state itself
//   renders from the server truth plus the overlay, so a revalidation
//   never forgets a confirmed vote;
// - deletes settle by dropping the session tombstone either way (on
//   success the revalidated thread carries the server tombstone, so keeping
//   the delta would subtract the reply twice from the card count) and by
//   forgetting the confirmed post (otherwise a reply deleted after its
//   revalidation echoed it would count as a fresh session reply for the rest
//   of the SPA session);
// - edits keep their override on success (it matches the stored body) and
//   roll back to the previous override on failure;
// - replies commit server-first (their ids are real), and the merges drop
//   confirmed posts the server already echoes by id.

function warnNotSaved(what: string, error: string): void {
  console.warn(`[board] ${what} not saved`, error);
}

export function syncThreadVote(threadId: string, serverVoted: boolean): void {
  const pressed = boardStore.threadVotePressed(serverVoted, boardStore.boardSnapshot(), threadId);
  if (pressed) boardStore.stageThreadUnvote(threadId);
  else boardStore.stageThreadUpvote(threadId);
  void boardActions.toggleThreadVote(threadId).then((result) => {
    if (!result.ok) {
      boardStore.rollbackThreadVote(threadId);
      warnNotSaved("thread vote", result.error);
    }
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
    if (result.ok) {
      boardStore.settlePostDelete(threadId, postId);
      return;
    }
    boardStore.restorePost(threadId, postId);
    warnNotSaved("delete", result.error);
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
