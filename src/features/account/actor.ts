import type { CommunityLevel, Viewer } from "@/content/commands";

// An account on the mocks: the handle is the stable identity (lower-case,
// path-safe by the account schema) and the display string at once. The level
// follows community-participation: Participant takes part in
// Discussions/ERRATA/Readroom, Member additionally works project tickets.
// Admin powers (admin/co-admin queues land in ui-member-applications) are a
// separate flag, never a community level; project Reviewer/Maintainer roles
// live on the project, not on the account.
export type Actor = {
  user: string;
  level: CommunityLevel;
  admin: boolean;
  // Verified at registration (email + OTP) or null for demo/social accounts.
  email: string | null;
};

export type AccountSeed = {
  user: string;
  level: CommunityLevel;
  admin?: boolean;
  email?: string;
};

// The single application point for levels: resolved here, never inferred
// from the session shape by consumers. The registry is plain module state —
// it lives as long as the server process. LOGOFF drops the cookie only, so
// switching actors never wipes accounts (or any feature store); a server
// restart drops dynamic registrations while the static demo roster stays.
export function createAccountRegistry(seed: readonly AccountSeed[]) {
  const known = new Map(seed.map((entry) => [entry.user, entry] as const));

  function toActor(user: string, entry: AccountSeed): Actor {
    return { user, level: entry.level, admin: entry.admin ?? false, email: entry.email ?? null };
  }

  return {
    resolve(user: string): Actor | null {
      const entry = known.get(user);
      return entry === undefined ? null : toActor(user, entry);
    },
    emailTaken(email: string): boolean {
      for (const entry of known.values()) {
        if (entry.email === email) return true;
      }
      return false;
    },
    // First contact provisions a Participant: the demo logon doubles as an
    // implicit registration, so fixture handles keep working without a roster
    // entry. Existing entries are never downgraded or rewritten here — the
    // email is stored on creation only, and a handle claimed while a code
    // waited is rejected by the registration flow, not attached.
    ensure(user: string, email?: string): Actor {
      const entry = known.get(user);
      if (entry !== undefined) return toActor(user, entry);
      const created: AccountSeed = { user, level: "participant", email };
      known.set(user, created);
      return toActor(user, created);
    },
    // The future apply flow (ui-member-applications) flips levels through
    // this function only. Unknown handles are not created here: the apply
    // queue owns the account first.
    setLevel(user: string, level: CommunityLevel): Actor | null {
      const entry = known.get(user);
      if (entry === undefined) return null;
      const updated: AccountSeed = { ...entry, level };
      known.set(user, updated);
      return toActor(user, updated);
    },
  };
}

// The viewer the shell and the command registry understand: level only,
// composed so the shell never imports the account slice.
export function actorViewer(actor: Actor | null): Viewer {
  return actor === null ? null : { level: actor.level };
}

export function isParticipant(actor: Actor | null): boolean {
  return actor?.level === "participant";
}

export function isMember(actor: Actor | null): boolean {
  return actor?.level === "member";
}

export function isAdmin(actor: Actor | null): boolean {
  return actor?.admin === true;
}
