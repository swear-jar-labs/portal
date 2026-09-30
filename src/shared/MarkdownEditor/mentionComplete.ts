import type { MentionIdentities } from "../mentions";

// @completion in the editor: the `@query` right before the caret and its
// directory matches. Pure logic — the MarkdownEditor owns the caret, the
// listbox and the key handling.

export type MentionQuery = {
  // The caret-relative span to replace, `@query` included.
  start: number;
  query: string;
};

export type MentionCandidate = {
  user: string;
  username: string;
};

const HANDLE_CHAR_PATTERN = /[A-Za-z0-9_-]/;
// Mirrors the mention guard (lib/mention-syntax): the `@` must not continue
// an email, a doubled `@@` or a dotted path.
const QUERY_GUARD_PATTERN = /[A-Za-z0-9_.@+-]/;
// The account canon caps handles at 32 chars: a longer query can match none.
const MENTION_QUERY_MAX_LENGTH = 32;
// The roster shows at most this many members: the popup caps its height to
// the same count (see .mentionBox max-height), so the list never scrolls
// short of a tiny viewport.
export const MAX_MENTION_SUGGESTIONS = 10;

function isHandleChar(char: string): boolean {
  return HANDLE_CHAR_PATTERN.test(char);
}

/** The completable `@query` ending at `caret`, or null outside one. */
export function mentionQueryBeforeCaret(value: string, caret: number): MentionQuery | null {
  let start = Math.max(0, Math.min(caret, value.length));
  while (start > 0 && isHandleChar(value[start - 1] ?? "")) start -= 1;
  if (value[start - 1] !== "@") return null;
  const at = start - 1;
  const before = value[at - 1];
  if (before !== undefined && QUERY_GUARD_PATTERN.test(before)) return null;
  const query = value.slice(start, caret);
  if (query.length > MENTION_QUERY_MAX_LENGTH) return null;
  return { start: at, query };
}

/** Directory entries whose user key or username starts with the query,
 * exact user-key matches first, then by username, capped for the listbox. */
export function matchMentionCandidates(
  query: string,
  identities: MentionIdentities,
): MentionCandidate[] {
  const prefix = query.toLowerCase();
  const candidates: MentionCandidate[] = [];
  for (const [user, identity] of Object.entries(identities)) {
    if (user.toLowerCase().startsWith(prefix) || identity.username.toLowerCase().startsWith(prefix))
      candidates.push({ user, username: identity.username });
  }
  candidates.sort(
    (first, second) =>
      Number(second.user.toLowerCase() === prefix) - Number(first.user.toLowerCase() === prefix) ||
      first.username.localeCompare(second.username),
  );
  return candidates.slice(0, MAX_MENTION_SUGGESTIONS);
}

export type MentionCompletion = {
  value: string;
  caret: number;
};

/** Splice the canonical `@user` plus a trailing space over the query span. */
export function applyMentionCompletion(
  value: string,
  query: MentionQuery,
  caret: number,
  user: string,
): MentionCompletion {
  const inserted = `@${user} `;
  return {
    value: `${value.slice(0, query.start)}${inserted}${value.slice(caret)}`,
    caret: query.start + inserted.length,
  };
}
