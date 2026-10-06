"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { posts, sections, tags, threads, threadTags, user as users, votes } from "@/db/schema";
import { getActorSession } from "@/features/account/contracts";
import { composeSchema, replySchema, type ComposeInput } from "../model/schema";
import {
  BOARD_INVALIDATION,
  type BoardActionError,
  type BoardActionResult,
  type BoardMutationKind,
} from "./board-invalidation";

const uuidSchema = z.string().uuid();

type BoardTx = Pick<typeof db, "query" | "select" | "insert" | "update" | "delete">;

// The transaction client the mutation records run on: exported for the
// action tests, which drive the records with stub clients (no database).
export type { BoardTx };

type MutationOutcome = { result: BoardActionResult; threadId: string | null };

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

// The mutate* wrapper (the epic's rule): the work commits in one
// transaction, then the slice's Record table names the tags and paths to
// heal. Failed work returns a null target, so nothing revalidates.
async function mutateBoard(
  kind: BoardMutationKind,
  work: (tx: BoardTx) => Promise<MutationOutcome>,
): Promise<BoardActionResult> {
  const { result, threadId } = await db.transaction(async (tx) => work(tx));
  if (threadId === null) return result;
  const plan = BOARD_INVALIDATION[kind]({ threadId });
  // updateTag expires the slice's named tags immediately (the Server Action
  // primitive with read-your-own-writes); the paths re-render their segments.
  for (const tag of plan.tags) updateTag(tag);
  for (const path of plan.paths) revalidatePath(path);
  for (const path of plan.layoutPaths) revalidatePath(path, "layout");
  return result;
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

function loginRequired(): BoardActionResult {
  return { ok: false, error: "login-required" };
}

export async function composeThread(input: unknown): Promise<BoardActionResult> {
  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  // The guest gate mirrors the UI: no member, no write — the client
  // raises the login prompt on this code.
  if (!actor) return loginRequired();
  return mutateBoard("compose", (tx) => composeRecord(tx, actor.user, parsed.data));
}

const replyToSchema = z.object({ replyTo: uuidSchema.optional() });

export async function replyToThread(threadId: string, input: unknown): Promise<BoardActionResult> {
  if (!uuidSchema.safeParse(threadId).success) return { ok: false, error: "invalid" };
  const parsed = replySchema.safeParse(input);
  const target = replyToSchema.safeParse(input);
  if (!parsed.success || !target.success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  if (!actor) return loginRequired();
  return mutateBoard("reply", (tx) =>
    replyRecord(tx, actor.user, threadId, parsed.data.body, target.data.replyTo),
  );
}

export async function editPost(postId: string, input: unknown): Promise<BoardActionResult> {
  if (!uuidSchema.safeParse(postId).success) return { ok: false, error: "invalid" };
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  if (!actor) return loginRequired();
  return mutateBoard("edit-post", (tx) => editRecord(tx, actor.user, postId, parsed.data.body));
}

export async function deletePost(postId: string): Promise<BoardActionResult> {
  if (!uuidSchema.safeParse(postId).success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  if (!actor) return loginRequired();
  return mutateBoard("delete-post", (tx) => deleteRecord(tx, actor.user, postId));
}

export async function toggleThreadVote(threadId: string): Promise<BoardActionResult> {
  if (!uuidSchema.safeParse(threadId).success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  if (!actor) return loginRequired();
  return mutateBoard("vote", (tx) => voteRecord(tx, actor.user, { kind: "thread", id: threadId }));
}

export async function togglePostVote(postId: string): Promise<BoardActionResult> {
  if (!uuidSchema.safeParse(postId).success) return { ok: false, error: "invalid" };
  const actor = await getActorSession();
  if (!actor) return loginRequired();
  return mutateBoard("vote", (tx) => voteRecord(tx, actor.user, { kind: "post", id: postId }));
}
