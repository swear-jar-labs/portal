import type { CommunityLevel } from "@/content/commands";
import type { Actor } from "./actor";

// Server-side authorization predicates: pure over the Actor prop-model, so
// pages and server actions gate on these instead of re-checking shapes.
// Presentation filtering (menus, files, keys) stays in commands.ts selectors.
const LEVEL_RANK = {
  participant: 0,
  member: 1,
} as const satisfies Record<CommunityLevel, number>;

export function isSignedIn(actor: Actor | null): actor is Actor {
  return actor !== null;
}

export function meetsLevel(actor: Actor | null, minimum: CommunityLevel): boolean {
  if (actor === null) return false;
  return LEVEL_RANK[actor.level] >= LEVEL_RANK[minimum];
}

// Admin powers are a flag apart from the levels: the predicate narrows, so a
// page can branch once and use the actor inside.
export function isAdmin(actor: Actor | null): actor is Actor {
  return actor !== null && actor.admin === true;
}
