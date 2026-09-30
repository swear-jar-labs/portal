import { mentionPattern } from "@/lib/mention-syntax";

// @mentions in message bodies: parsing, recipient resolution and stable event
// ids. Pure functions only — no feature or context imports, so the markdown
// pipeline, the editor and the inbox producers can all share them without
// touching the slice graph. The syntax itself lives in lib/mention-syntax.

export type MentionIdentities = Readonly<Record<string, { username: string }>>;

const FENCED_CODE_PATTERN = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;

/** Raw markdown without fenced and inline code: tags inside code never notify. */
export function stripMentionCode(text: string): string {
  return text.replace(FENCED_CODE_PATTERN, "").replace(INLINE_CODE_PATTERN, "");
}

/** Handles as typed, lower-cased and deduped in first-seen order. */
export function extractMentionHandles(text: string): string[] {
  const seen = new Set<string>();
  const handles: string[] = [];
  for (const match of text.matchAll(mentionPattern())) {
    const raw = match[1];
    if (raw === undefined) continue;
    const handle = raw.toLowerCase();
    if (seen.has(handle)) continue;
    seen.add(handle);
    handles.push(handle);
  }
  return handles;
}

/** Lower-cased handle or alias → stable user key. Later usernames win: the
 * registry rejects taken names, so a collision cannot name two accounts. */
export type MentionDirectory = ReadonlyMap<string, string>;

export function buildMentionDirectory(identities: MentionIdentities): MentionDirectory {
  const directory = new Map<string, string>();
  for (const [user, identity] of Object.entries(identities)) {
    directory.set(user.toLowerCase(), user);
    directory.set(identity.username.toLowerCase(), user);
  }
  return directory;
}

/** Handles resolved to user keys, unknown ones dropped, order kept. */
export function resolveMentionHandles(
  handles: readonly string[],
  directory: MentionDirectory,
): string[] {
  const seen = new Set<string>();
  const users: string[] = [];
  for (const handle of handles) {
    const user = directory.get(handle.toLowerCase());
    if (user === undefined || seen.has(user)) continue;
    seen.add(user);
    users.push(user);
  }
  return users;
}

export type MentionRecipientsInput = {
  body: string;
  authorUser: string;
  directory: MentionDirectory;
};

/** Who a message notifies: resolved handles minus the author. Code segments
 * never tag; rendering still shows the raw `@text` for unknown handles. */
export function mentionRecipients({
  body,
  authorUser,
  directory,
}: MentionRecipientsInput): string[] {
  const author = authorUser.toLowerCase();
  return resolveMentionHandles(extractMentionHandles(stripMentionCode(body)), directory).filter(
    (user) => user.toLowerCase() !== author,
  );
}

const MENTION_EVENT_ID_PREFIX = "mention";

/** Stable per message and recipient: reposts, rerenders and edits that keep
 * the tag never double-deliver — the inbox store drops repeated ids. */
export function mentionEventId(messageId: string, user: string): string {
  return `${MENTION_EVENT_ID_PREFIX}:${messageId}:${user}`;
}
