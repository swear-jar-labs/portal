import type { SocialProvider } from "./mock-session";
import { createAccountRegistry, type Actor } from "../model/actor";
import {
  createVerificationStore,
  type PendingVerification,
  type VerificationCheck,
  type VerificationStart,
} from "../model/verification";

// The demo roster: ada and grace back the social buttons and the existing
// member-path specs; admin and coadmin review the application queue. Every
// other handle provisions as a Participant on first contact, so fixture
// authors (ken, lin) and fresh registrations need no roster entry. Mock-only:
// production auth resolves levels from the
// backend, and this module never ships real credentials.
const registry = createAccountRegistry([
  { user: "ada", level: "member" },
  { user: "grace", level: "member" },
  { user: "ken", level: "member" },
  { user: "lin", level: "member" },
  { user: "admin", level: "member", admin: true },
  { user: "coadmin", level: "member", admin: true },
  { user: "demo-candidate", level: "participant" },
  { user: "demo-second", level: "participant" },
]);

const verifications = createVerificationStore();

export function resolveAccount(user: string): Actor | null {
  return registry.resolve(user);
}

export function listMemberUsers(): string[] {
  return registry.memberUsers();
}

export function ensureAccount(user: string): Actor {
  return registry.ensure(user);
}

export function promoteAccount(user: string): Actor | null {
  return registry.setLevel(user, "member");
}

export function updateAccountProfile(
  key: string,
  input: { username: string; bio: string; avatar?: string | null },
) {
  return registry.updateProfile(key, input);
}

export function memberIdentities() {
  return registry.identities();
}

// Social signup provisions its own demo Participant per provider: unlike the
// social logon (which lands the provider's long-lived demo Member), a fresh
// signup starts a new account at the Participant level — mirroring what the
// real OAuth flow will do in Phase 5.
const socialRegisterUsers = {
  google: "google-newcomer",
  github: "github-newcomer",
} as const satisfies Record<SocialProvider, string>;

export function ensureSocialAccount(provider: SocialProvider): Actor {
  return registry.ensure(socialRegisterUsers[provider]);
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
  if (registry.resolve(user)) return { ok: false, error: "taken" };
  // The pending store claims its mailbox too: two handles must not verify the
  // same address in parallel.
  if (registry.emailTaken(email) || verifications.hasPendingEmail(email, user)) {
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
  if (registry.resolve(user)) return { result: "taken", actor: null };
  const checked = verifications.confirm(user, input, now);
  if (checked !== "ok") return { result: checked, actor: null };
  return { result: "ok", actor: registry.ensure(user, pending.email) };
}
