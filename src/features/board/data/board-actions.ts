"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { getActorSession } from "@/features/account/contracts";
import { composeSchema, replySchema } from "../model/schema";
import {
  BOARD_INVALIDATION,
  type BoardActionResult,
  type BoardMutationKind,
} from "./board-invalidation";
import {
  composeRecord,
  deleteRecord,
  editRecord,
  replyRecord,
  voteRecord,
  type BoardTx,
  type MutationOutcome,
} from "./board-records";

const uuidSchema = z.string().uuid();

// The mutate* wrapper (the epic's rule): the work commits in one
// transaction, then the slice's Record table names the paths to heal.
// Failed work returns a null target, so nothing revalidates.
async function mutateBoard(
  kind: BoardMutationKind,
  work: (tx: BoardTx) => Promise<MutationOutcome>,
): Promise<BoardActionResult> {
  const { result, threadId } = await db.transaction(async (tx) => work(tx));
  if (threadId === null) return result;
  const plan = BOARD_INVALIDATION[kind]({ threadId });
  for (const path of plan.paths) revalidatePath(path);
  for (const path of plan.layoutPaths) revalidatePath(path, "layout");
  return result;
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
