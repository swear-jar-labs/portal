"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActorSession, mockSessionEnabled, resolveAccount } from "@/features/account/contracts";
import { changeProjectTeam } from "./team-operations";
import { projectTeamActionIds, type TeamError } from "./team-store";

const actionSchema = z.object({
  slug: z.string().min(1),
  action: z.enum(projectTeamActionIds),
  target: z.string().optional(),
});
type ActionResult = { ok: true } | { ok: false; error: TeamError | "invalid" | "unavailable" };

export async function mockProjectTeamAction(input: unknown): Promise<ActionResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { slug, action, target } = parsed.data;
  const actor = await getActorSession();
  const selected = target ? resolveAccount(target) : null;
  const result = await changeProjectTeam(actor, slug, action, selected);
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ok: true };
}
