import type { SocialProvider } from "./mock-session";
import type { Actor } from "../model/actor";
import {
  createVerificationStore,
  type PendingVerification,
  type VerificationCheck,
  type VerificationStart,
} from "../model/verification";
import { emailTaken, ensureAccount, resolveAccount } from "./account-registry";

// The registration half of the mock accounts: the OTP store is server-only
// (node:crypto), so this module never reaches a client component — the
// roster itself lives in account-registry.ts, which is client-safe.
const verifications = createVerificationStore();

// Social signup provisions its own demo Participant per provider: unlike the
// social logon (which lands the provider's long-lived demo Member), a fresh
// signup starts a new account at the Participant level — mirroring what the
// real OAuth flow will do in Phase 5.
const socialRegisterUsers = {
  google: "google-newcomer",
  github: "github-newcomer",
} as const satisfies Record<SocialProvider, string>;

export function ensureSocialAccount(provider: SocialProvider): Actor {
  return ensureAccount(socialRegisterUsers[provider]);
}

// Email registration is two steps: the code goes out (shown on screen in the
// demo — no mailbox involved) and comes back through the form. The flow owns
// both claims, so a handle or a mailbox taken while a code waited never
// produces a second account.
export type RegistrationStartResult =
  { ok: true; pending: PendingVerification } | { ok: false; error: "taken" | "email-taken" };

export function startRegistration(
  user: string,
  email: string,
  start: VerificationStart = {},
): RegistrationStartResult {
  if (resolveAccount(user)) return { ok: false, error: "taken" };
  // The pending store claims its mailbox too: two handles must not verify the
  // same address in parallel.
  if (emailTaken(email) || verifications.hasPendingEmail(email, user)) {
    return { ok: false, error: "email-taken" };
  }
  return { ok: true, pending: verifications.start(user, email, start) };
}

export type RegistrationConfirmResult =
  | { result: "ok"; actor: Actor }
  | { result: "taken" | Exclude<VerificationCheck, "ok"> | "missing"; actor: null };

export function confirmRegistration(
  user: string,
  input: string,
  now: number = Date.now(),
): RegistrationConfirmResult {
  const pending = verifications.pendingFor(user);
  if (!pending) return { result: "missing", actor: null };
  // The handle could be claimed while the code waited (a demo logon
  // provisions it): refuse without burning the code, so the form can ask for
  // another handle. The mailbox is claimed by the pending code itself (see
  // startRegistration), so only the handle is re-checked here.
  if (resolveAccount(user)) return { result: "taken", actor: null };
  const checked = verifications.confirm(user, input, now);
  if (checked !== "ok") return { result: checked, actor: null };
  return { result: "ok", actor: ensureAccount(user, pending.email) };
}
