"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  confirmRegistration,
  ensureAccount,
  ensureSocialAccount,
  startRegistration,
} from "./mock-accounts";
import {
  MOCK_SESSION_COOKIE,
  MOCK_SESSION_MAX_AGE_S,
  mockLogonSchema,
  mockRegisterConfirmSchema,
  mockRegisterStartSchema,
  mockSessionEnabled,
  mockSocialLogonSchema,
  socialProviderUsers,
} from "./mock-session";

export type MockLogonResult =
  { ok: true; user: string } | { ok: false; error: "invalid" | "unavailable" };

export type MockRegisterStartResult =
  | { ok: true; user: string; demoCode: string }
  | { ok: false; error: "invalid" | "taken" | "email-taken" | "unavailable" };

export type MockRegisterConfirmResult =
  | { ok: true; user: string }
  | { ok: false; error: "invalid" | "mismatch" | "expired" | "missing" | "taken" | "unavailable" };

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

  // First contact provisions a Participant (see actor.ts): the demo logon
  // doubles as an implicit registration. No password is checked or stored.
  const actor = ensureAccount(parsed.data.user);
  await setMockSession(actor.user);
  return { ok: true, user: actor.user };
}

export async function mockStartRegistration(input: unknown): Promise<MockRegisterStartResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };

  const parsed = mockRegisterStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // No mail leaves the demo: the code is issued server-side and shown on
  // screen, and the account is created only after it comes back. The flow
  // owns the taken checks (handle and mailbox, pending codes included).
  const started = startRegistration(parsed.data.user, parsed.data.email);
  if (!started.ok) return { ok: false, error: started.error };
  return { ok: true, user: started.pending.user, demoCode: started.pending.code };
}

export async function mockConfirmRegistration(input: unknown): Promise<MockRegisterConfirmResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };

  const parsed = mockRegisterConfirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const confirmation = confirmRegistration(parsed.data.user, parsed.data.code);
  if (confirmation.result !== "ok") return { ok: false, error: confirmation.result };

  await setMockSession(confirmation.actor.user);
  return { ok: true, user: confirmation.actor.user };
}

export async function mockSocialRegister(input: unknown): Promise<MockLogonResult> {
  if (!mockSessionEnabled()) return { ok: false, error: "unavailable" };

  const parsed = mockSocialLogonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const actor = ensureSocialAccount(parsed.data.provider);
  await setMockSession(actor.user);
  return { ok: true, user: actor.user };
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
