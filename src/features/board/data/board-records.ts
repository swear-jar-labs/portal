import { and, eq, inArray, isNull } from "drizzle-orm";

import type { db } from "@/db";
import { posts, sections, tags, threads, threadTags, user as users, votes } from "@/db/schema";
import type { ComposeInput } from "../model/schema";
import type { BoardActionError, BoardActionResult } from "./board-invalidation";

// The transaction client the mutation records run on. Plain module (no
// "use server"): server actions must export async functions only, so the
// records live here and the tests drive them with stub clients.
export type BoardTx = Pick<typeof db, "query" | "select" | "insert" | "update" | "delete">;

export type MutationOutcome = { result: BoardActionResult; threadId: string | null };

function failure(error: BoardActionError): MutationOutcome {
  return { result: { ok: false, error }, threadId: null };
}

async function findAuthorId(tx: BoardTx, username: string): Promise<string | null> {
  const row = await tx.query.user.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  });
  return row?.id ?? null;
}

// A composed thread commits the thread, its opening post and its status
// tags at once and returns the id: the card links its route immediately,
// the mock's routeless local thread is gone.
export async function composeRecord(
  tx: BoardTx,
  username: string,
  input: ComposeInput,
): Promise<MutationOutcome> {
  const authorId = await findAuthorId(tx, username);
  if (authorId === null) return failure("unavailable");
  const section = await tx.query.sections.findFirst({
    where: eq(sections.slug, input.board),
    columns: { id: true },
  });
  if (section === undefined || section === null) return failure("unavailable");
  const tagRows =
    input.tags.length === 0
      ? []
      : await tx.query.tags.findMany({
          where: inArray(tags.slug, [...input.tags]),
          columns: { id: true },
        });
  if (tagRows.length !== input.tags.length) return failure("unavailable");
  const now = new Date();
  const inserted = await tx
    .insert(threads)
    .values({
      sectionId: section.id,
      authorId,
      title: input.title,
      techs: [...input.techs],
      lastPostAt: now,
    })
    .returning({ id: threads.id });
  const threadId = inserted[0]?.id;
  if (threadId === undefined) return failure("unavailable");
  await tx.insert(posts).values({ threadId, authorId, body: input.body });
  if (tagRows.length > 0) {
    await tx.insert(threadTags).values(tagRows.map((tag) => ({ threadId, tagId: tag.id })));
  }
  return { result: { ok: true, id: threadId }, threadId };
}

export async function replyRecord(
  tx: BoardTx,
  username: string,
  threadId: string,
  body: string,
  replyTo: string | undefined,
): Promise<MutationOutcome> {
  const thread = await tx.query.threads.findFirst({
    where: and(eq(threads.id, threadId), isNull(threads.deletedAt)),
    columns: { id: true, locked: true },
  });
  if (thread === undefined || thread === null) return failure("missing");
  // A locked thread takes no replies: the control hides in the UI, the
  // server refuses all the same.
  if (thread.locked) return failure("forbidden");
  if (replyTo !== undefined) {
    const parent = await tx.query.posts.findFirst({
      where: and(eq(posts.id, replyTo), eq(posts.threadId, threadId), isNull(posts.deletedAt)),
      columns: { id: true },
    });
    if (parent === undefined || parent === null) return failure("invalid");
  }
  const authorId = await findAuthorId(tx, username);
  if (authorId === null) return failure("unavailable");
  const now = new Date();
  const inserted = await tx
    .insert(posts)
    .values({ threadId, authorId, body, ...(replyTo === undefined ? {} : { replyToId: replyTo }) })
    .returning({ id: posts.id, createdAt: posts.createdAt });
  const post = inserted[0];
  if (post === undefined) return failure("unavailable");
  await tx.update(threads).set({ lastPostAt: now }).where(eq(threads.id, threadId));
  return {
    result: { ok: true, id: post.id, createdAt: post.createdAt.toISOString() },
    threadId,
  };
}

export async function editRecord(
  tx: BoardTx,
  username: string,
  postId: string,
  body: string,
): Promise<MutationOutcome> {
  const post = await tx.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
    columns: { id: true, authorId: true, threadId: true },
  });
  if (post === undefined || post === null) return failure("missing");
  const authorId = await findAuthorId(tx, username);
  // The edit/delete gate is the author, checked on the server: anyone
  // else's post refuses, whatever the client rendered.
  if (authorId === null || post.authorId !== authorId) return failure("forbidden");
  await tx.update(posts).set({ body, editedAt: new Date() }).where(eq(posts.id, postId));
  return { result: { ok: true, id: postId }, threadId: post.threadId };
}

export async function deleteRecord(
  tx: BoardTx,
  username: string,
  postId: string,
): Promise<MutationOutcome> {
  const post = await tx.query.posts.findFirst({
    where: eq(posts.id, postId),
    columns: { id: true, authorId: true, threadId: true },
  });
  if (post === undefined || post === null) return failure("missing");
  const authorId = await findAuthorId(tx, username);
  if (authorId === null || post.authorId !== authorId) return failure("forbidden");
  // Tombstone, never a hard delete: the row keeps its place (reply markers
  // still resolve) while the body reads back empty. Idempotent — a second
  // delete answers ok over the same tombstone.
  await tx.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postId));
  return { result: { ok: true, id: postId }, threadId: post.threadId };
}

export async function voteRecord(
  tx: BoardTx,
  username: string,
  target: { kind: "thread" | "post"; id: string },
): Promise<MutationOutcome> {
  const threadId =
    target.kind === "thread"
      ? ((
          await tx.query.threads.findFirst({
            where: and(eq(threads.id, target.id), isNull(threads.deletedAt)),
            columns: { id: true },
          })
        )?.id ?? null)
      : ((
          await tx.query.posts.findFirst({
            where: and(eq(posts.id, target.id), isNull(posts.deletedAt)),
            columns: { threadId: true },
          })
        )?.threadId ?? null);
  if (threadId === null) return failure("missing");
  const authorId = await findAuthorId(tx, username);
  if (authorId === null) return failure("unavailable");
  // Toggle up: one row per (user, target); hotness recomputes on read.
  const existing = await tx.query.votes.findFirst({
    where: and(
      eq(votes.userId, authorId),
      eq(votes.targetType, target.kind),
      eq(votes.targetId, target.id),
    ),
    columns: { id: true },
  });
  if (existing === undefined || existing === null) {
    await tx
      .insert(votes)
      .values({ userId: authorId, targetType: target.kind, targetId: target.id });
  } else {
    await tx.delete(votes).where(eq(votes.id, existing.id));
  }
  return { result: { ok: true, id: target.id }, threadId };
}
