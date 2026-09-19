// The demo members of the UI-first fixtures: the single registry that maps a
// user to a bundled picture. Without an entry the Avatar falls back to the
// letter square; uploads arrive with the backend (TECH.md §5, Phase 5).

export const memberAvatars = {
  ada: "/avatars/ada.png",
  grace: "/avatars/grace.png",
} as const satisfies Partial<Record<string, string>>;

// The public member route is shared by board bylines and the future Members
// index. User names already have the account schema's path-safe canon.
export const MEMBER_PATH = "/members";

export function memberPath(user: string): string {
  return `${MEMBER_PATH}/${user}`;
}

export function avatarFor(user: string): string | undefined {
  return Object.hasOwn(memberAvatars, user)
    ? memberAvatars[user as keyof typeof memberAvatars]
    : undefined;
}
