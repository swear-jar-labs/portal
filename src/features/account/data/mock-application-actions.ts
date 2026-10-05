"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fixturesEnabled } from "@/shared/mock";
import { applySchema } from "../model/schema";
import { MAX_NOTE_LENGTH, type ApplicationError } from "../model/applications";
import { getActorSession } from "./auth-session.server";
import {
  decideMemberApplication,
  respondToMemberApplication,
  submitMemberApplication,
} from "./mock-applications";

type ActionResult =
  { ok: true; id?: string } | { ok: false; error: ApplicationError | "unavailable" };

const responseSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  note: z.string().trim().min(1).max(MAX_NOTE_LENGTH),
});
const decisionSchema = responseSchema.extend({
  decision: z.enum(["clarification-requested", "approved", "rejected"]),
  note: z.string().trim().max(MAX_NOTE_LENGTH),
});

function finish(result: { ok: boolean; error?: ApplicationError }): ActionResult {
  if (!result.ok) return { ok: false, error: result.error ?? "invalid" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function mockSubmitMemberApplication(input: unknown): Promise<ActionResult> {
  if (!fixturesEnabled()) return { ok: false, error: "unavailable" };
  const actor = await getActorSession();
  if (!actor || actor.level !== "participant") return { ok: false, error: "forbidden" };
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  // The id travels back so the form can address the inbox notice: the store
  // drops a repeated stable id, so a retried submit never double-pages admins.
  const result = submitMemberApplication(actor, parsed.data);
  if (!result.ok) return { ok: false, error: result.error ?? "invalid" };
  revalidatePath("/", "layout");
  return { ok: true, id: result.application.id };
}

export async function mockRespondToMemberApplication(input: unknown): Promise<ActionResult> {
  if (!fixturesEnabled()) return { ok: false, error: "unavailable" };
  const actor = await getActorSession();
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return finish(
    respondToMemberApplication(actor, parsed.data.id, parsed.data.version, parsed.data.note),
  );
}

export async function mockDecideMemberApplication(input: unknown): Promise<ActionResult> {
  if (!fixturesEnabled()) return { ok: false, error: "unavailable" };
  const actor = await getActorSession();
  if (!actor?.admin) return { ok: false, error: "forbidden" };
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, version, decision, note } = parsed.data;
  return finish(decideMemberApplication(actor, id, version, decision, note));
}
