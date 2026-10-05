import { createAccountRegistry, type Actor } from "../model/actor";

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

// Client-safe: the registry is plain module state (see model/actor.ts) with no
// node APIs, so client components may read it (the apply form lists admin
// reviewers). The registration half lives in mock-registration.ts — that one owns
// the OTP store and stays server-only.
export function resolveAccount(user: string): Actor | null {
  return registry.resolve(user);
}

export function listMemberUsers(): string[] {
  return registry.memberUsers();
}

export function listAdminUsers(): string[] {
  return registry.adminUsers();
}

export function ensureAccount(user: string, email?: string): Actor {
  return registry.ensure(user, email);
}

// The logon credential is a handle or a mailbox: a mailbox resolves to its
// verified account (unknown mailboxes refuse — they never provision), a
// handle passes through to the first-contact provisioning.
export function resolveLogonUser(login: string): string | null {
  if (!login.includes("@")) return login;
  return registry.userForEmail(login);
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

export function memberIdentities(): Record<
  string,
  { username: string; avatar: string | null | undefined }
> {
  return registry.identities();
}

export function emailTaken(email: string): boolean {
  return registry.emailTaken(email);
}
