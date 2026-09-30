// The single source of the @mention syntax, shared by the parser
// (shared/mentions) and the markdown plugin (lib/markdown/mentions). The
// layering runs shared → lib, so both sides import from here. The handle canon
// mirrors USER_PATTERN in features/account/model/schema.ts (lower-case,
// path-safe, 2–32 chars): lib and shared must not import features, so the
// schema stays canonical and this module repeats the bounds.

export const MENTION_HANDLE_SOURCE = "[A-Za-z0-9_-]{2,32}";

// A `@` right after one of these never starts a mention: emails (`ada@x.io`),
// doubled `@@` and dotted paths stay plain text.
export const MENTION_GUARD_SOURCE = "[A-Za-z0-9_.@+-]";

// The handle must end here: an overlong `@handle…` is not a mention at all,
// not a truncated one.
export const MENTION_TAIL_SOURCE = "(?![A-Za-z0-9_-])";

export function mentionPattern(): RegExp {
  return new RegExp(
    `(?<!${MENTION_GUARD_SOURCE})@(${MENTION_HANDLE_SOURCE})${MENTION_TAIL_SOURCE}`,
    "g",
  );
}
