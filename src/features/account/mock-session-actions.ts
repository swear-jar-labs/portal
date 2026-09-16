"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  MOCK_SESSION_COOKIE,
  MOCK_SESSION_MAX_AGE_S,
  mockLogonSchema,
  mockSessionEnabled,
  mockSocialLogonSchema,
  socialProviderUsers,
} from "./mock-session";

export type MockLogonResult =
  { ok: true; user: string } | { ok: false; error: "invalid" | "unavailable" };

async function setMockSession(user: string): Promise<void> {
  const store = await cookies();
  store.set(MOCK_SESSION_COOKIE, user, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MOCK_SESSION_MAX_AGE_S,
  });
  revalidatePath("/", "layout");
}

export async function mockLogon(input: unknown): Promise<MockLogonResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };

  const parsed = mockLogonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  await setMockSession(parsed.data.user);
  return { ok: true, user: parsed.data.user };
}

export async function mockSocialLogon(input: unknown): Promise<MockLogonResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };

  const parsed = mockSocialLogonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const user = socialProviderUsers[parsed.data.provider];
  await setMockSession(user);
  return { ok: true, user };
}

export async function mockLogoff(): Promise<void> {
  const store = await cookies();
  store.delete(MOCK_SESSION_COOKIE);
  revalidatePath("/", "layout");
}
