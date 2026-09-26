import type { CommunityLevel } from "@/content/commands";
import { messages } from "@/content/messages";

// An account on the mocks: the original handle is the stable identity
// (lower-case, path-safe by the account schema); username may change. The level
// follows community-participation: Participant takes part in
// Discussions/ERRATA/Readroom, Member additionally works project tickets.
// Admin powers are a separate flag, never a community level; project Reviewer/Maintainer roles
// live on the project, not on the account.
export type Actor = {
  // Stable mock key used by existing content, roles and the session cookie.
  user: string;
  username: string;
  bio: string;
  avatar: string | null | undefined;
  level: CommunityLevel;
  admin: boolean;
  // Verified at registration (email + OTP) or null for demo/social accounts.
  email: string | null;
};

export type AccountSeed = {
  user: string;
  username?: string;
  bio?: string;
  avatar?: string | null;
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
  const aliases = new Map(
    seed.flatMap((entry) => [
      [entry.user, entry.user] as const,
      [entry.username ?? entry.user, entry.user] as const,
    ]),
  );

  function toActor(user: string, entry: AccountSeed): Actor {
    return {
      user,
      username: entry.username ?? user,
      bio: entry.bio ?? messages.account.profile.defaultBio,
      avatar: entry.avatar,
      level: entry.level,
      admin: entry.admin ?? false,
      email: entry.email ?? null,
    };
  }

  return {
    resolve(user: string): Actor | null {
      const key = aliases.get(user) ?? user;
      const entry = known.get(key);
      return entry === undefined ? null : toActor(key, entry);
    },
    emailTaken(email: string): boolean {
      for (const entry of known.values()) {
        if (entry.email === email) return true;
      }
      return false;
    },
    memberUsers(): string[] {
      return [...known.values()]
        .filter((entry) => entry.level === "member")
        .map((entry) => entry.user)
        .sort();
    },
    // First contact provisions a Participant: the demo logon doubles as an
    // implicit registration, so fixture handles keep working without a roster
    // entry. Existing entries are never downgraded or rewritten here — the
    // email is stored on creation only, and a handle claimed while a code
    // waited is rejected by the registration flow, not attached.
    ensure(user: string, email?: string): Actor {
      const existing = this.resolve(user);
      if (existing !== null) return existing;
      const created: AccountSeed = { user, level: "participant", email };
      known.set(user, created);
      aliases.set(user, user);
      return toActor(user, created);
    },
    updateProfile(
      key: string,
      input: { username: string; bio: string; avatar?: string | null },
    ): { ok: true; actor: Actor } | { ok: false; error: "missing" | "taken" } {
      const entry = known.get(key);
      if (!entry) return { ok: false, error: "missing" };
      const owner = aliases.get(input.username);
      if (owner !== undefined && owner !== key) return { ok: false, error: "taken" };
      aliases.set(input.username, key);
      const updated: AccountSeed = {
        ...entry,
        username: input.username,
        bio: input.bio,
        ...(input.avatar === undefined ? {} : { avatar: input.avatar }),
      };
      known.set(key, updated);
      return { ok: true, actor: toActor(key, updated) };
    },
    identities(): Record<string, { username: string; avatar: string | null | undefined }> {
      return Object.fromEntries(
        [...known].map(([key, entry]) => [
          key,
          { username: entry.username ?? key, avatar: entry.avatar },
        ]),
      );
    },
    // The apply flow flips levels through this function only. Unknown handles are not created here: the apply
    // queue owns the account first. Like resolve, it accepts a reserved alias:
    // every caller-visible handle names the same stable account.
    setLevel(user: string, level: CommunityLevel): Actor | null {
      const key = aliases.get(user) ?? user;
      const entry = known.get(key);
      if (entry === undefined) return null;
      const updated: AccountSeed = { ...entry, level };
      known.set(key, updated);
      return toActor(key, updated);
    },
  };
}
