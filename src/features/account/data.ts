// UI-first slice: types + fixtures. When the backend lands (Phase 5) the
// function bodies change, the pages and signatures do not (TECH.md §5).

import { avatarFor } from "@/shared/members";

export type MemberRole = "member";

export type MemberStat = {
  id: "merged" | "reviews" | "errata";
  value: number;
};

export type MemberProfile = {
  user: string;
  role: MemberRole;
  joined: string;
  bio: string;
  stats: readonly MemberStat[];
  activity: readonly string[];
  // The picture of the member; without one the Avatar falls back to the letter
  // square (the registry lives in shared/members).
  avatar?: string;
};

export async function getOwnProfile(user: string): Promise<MemberProfile> {
  return {
    user,
    role: "member",
    joined: new Date().toISOString().slice(0, 10),
    avatar: avatarFor(user),
    bio: "Learning how things work, one broken build at a time.",
    stats: [
      { id: "merged", value: 0 },
      { id: "reviews", value: 0 },
      { id: "errata", value: 0 },
    ],
    activity: [],
  };
}
