"use server";

import { revalidatePath } from "next/cache";
import { getActorSession } from "./mock-session.server";
import { mockSessionEnabled } from "./mock-session";
import { updateAccountProfile } from "./mock-accounts";
import { PROFILE_AVATAR_MAX_BYTES, profileSchema } from "../model/schema";

const AVATAR_DATA_URL = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

export type ProfileSaveResult =
  { ok: true; username: string } | { ok: false; error: "unavailable" | "invalid" | "taken" };

export async function mockSaveProfile(input: unknown): Promise<ProfileSaveResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };
  const actor = await getActorSession();
  if (!actor) return { ok: false, error: "unavailable" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { avatar } = parsed.data;
  if (typeof avatar === "string") {
    const match = AVATAR_DATA_URL.exec(avatar);
    if (!match || !match[2] || Buffer.byteLength(match[2], "base64") > PROFILE_AVATAR_MAX_BYTES) {
      return { ok: false, error: "invalid" };
    }
  }
  const result = updateAccountProfile(actor.user, parsed.data);
  if (!result.ok) return { ok: false, error: result.error === "taken" ? "taken" : "unavailable" };
  revalidatePath("/", "layout");
  return { ok: true, username: result.actor.username };
}
