// The demo members of the UI-first fixtures: the single registry that maps a
// user to a bundled picture. Without an entry the Avatar falls back to the
// letter square; uploads arrive with the backend (TECH.md §5, Phase 5).

export const memberAvatars = {
  ada: "/avatars/ada.png",
  grace: "/avatars/grace.png",
} as const satisfies Partial<Record<string, string>>;

export function avatarFor(user: string): string | undefined {
  return Object.hasOwn(memberAvatars, user)
    ? memberAvatars[user as keyof typeof memberAvatars]
    : undefined;
}
