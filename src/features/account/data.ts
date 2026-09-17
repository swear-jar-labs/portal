// UI-first slice: types + fixtures. When the backend lands (Phase 5) the
// function bodies change, the pages and signatures do not (TECH.md §5).

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
  // square. Uploads arrive with the backend.
  avatar?: string;
};

// Demo avatars until uploads exist: the Google demo user has a picture, the
// rest fall back to their letter.
const demoAvatars: Record<string, string> = { ada: "/avatars/ada.svg" };

export async function getOwnProfile(user: string): Promise<MemberProfile> {
  return {
    user,
    role: "member",
    joined: new Date().toISOString().slice(0, 10),
    avatar: demoAvatars[user],
    bio: "Learning by hand, one broken build at a time. No AI co-author.",
    stats: [
      { id: "merged", value: 0 },
      { id: "reviews", value: 0 },
      { id: "errata", value: 0 },
    ],
    activity: [],
  };
}
