// UI-first slice: types + fixtures. When the backend lands (Phase 5) the
// function bodies change, the pages and signatures do not (TECH.md §5).

import { avatarFor } from "@/shared/members";
import type { CommunityLevel } from "@/content/commands";
import { messages } from "@/content/messages";

export type MemberStat = {
  id: "merged" | "reviews" | "errata";
  value: number;
};

export type MemberProfile = {
  user: string;
  role: CommunityLevel;
  admin: boolean;
  joined: string;
  bio: string;
  stats: readonly MemberStat[];
  activity: readonly string[];
  // The picture of the member; without one the Avatar falls back to the letter
  // square (the registry lives in shared/members).
  avatar?: string;
};

export async function getOwnProfile(
  user: string,
  standing: {
    level: CommunityLevel;
    admin: boolean;
    username?: string;
    bio?: string;
    avatar?: string | null;
  },
): Promise<MemberProfile> {
  return {
    user: standing.username ?? user,
    role: standing.level,
    admin: standing.admin,
    joined: new Date().toISOString().slice(0, 10),
    avatar: standing.avatar === null ? undefined : (standing.avatar ?? avatarFor(user)),
    bio: standing.bio ?? messages.account.profile.defaultBio,
    stats: [
      { id: "merged", value: 0 },
      { id: "reviews", value: 0 },
      { id: "errata", value: 0 },
    ],
    activity: [],
  };
}
