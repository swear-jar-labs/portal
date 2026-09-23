import type { CommunityLevel } from "@/content/commands";
import type { SocialProvider } from "./mock-session";
import { createAccountRegistry, type Actor } from "./actor";
import {
  createVerificationStore,
  type PendingVerification,
  type VerificationCheck,
  type VerificationStart,
} from "./verification";

// The demo roster: ada and grace back the social buttons and the existing
// member-path specs; admin previews the admin/co-admin queues (full workflow
// in ui-member-applications). Every other handle provisions as a Participant
// on first contact, so fixture authors (ken, lin) and fresh registrations
// need no roster entry. Mock-only: production auth resolves levels from the
// backend, and this module never ships real credentials.
const registry = createAccountRegistry([
  { user: "ada", level: "member" },
  { user: "grace", level: "member" },
  { user: "admin", level: "member", admin: true },
]);

const verifications = createVerificationStore();

export function resolveAccount(user: string): Actor | null {
  return registry.resolve(user);
}

export function ensureAccount(user: string, email?: string): Actor {
  return registry.ensure(user, email);
}

export function accountEmailTaken(email: string): boolean {
  return registry.emailTaken(email);
}

export function setAccountLevel(user: string, level: CommunityLevel): Actor | null {
  return registry.setLevel(user, level);
}

// Social signup provisions its own demo Participant per provider: unlike the
// social logon (which lands the provider's long-lived demo Member), a fresh
// signup starts a new account at the Participant level — mirroring what the
// real OAuth flow will do in Phase 5.
export const socialRegisterUsers = {
  google: "google-newcomer",
  github: "github-newcomer",
} as const satisfies Record<SocialProvider, string>;

export function ensureSocialAccount(provider: SocialProvider): Actor {
  return registry.ensure(socialRegisterUsers[provider]);
}

// Email registration is two steps: the code goes out (shown on screen in the
// demo — no mailbox involved) and comes back through the form.
export function startRegistration(
  user: string,
  email: string,
  start: VerificationStart = {},
): PendingVerification {
  return verifications.start(user, email, start);
}

export function confirmRegistration(
  user: string,
  input: string,
  now: number = Date.now(),
):
  | { result: "ok"; actor: Actor }
  | { result: Exclude<VerificationCheck, "ok"> | "missing"; actor: null } {
  const pending = verifications.pendingFor(user);
  if (!pending) return { result: "missing", actor: null };
  const checked = verifications.confirm(user, input, now);
  if (checked !== "ok") return { result: checked, actor: null };
  return { result: "ok", actor: registry.ensure(user, pending.email) };
}
