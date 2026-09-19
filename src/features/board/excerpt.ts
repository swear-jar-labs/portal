// The reply context in one line: the parent's first line that carries text,
// with Markdown reduced to plain words. It reads raw Markdown bodies alike
// (fixtures and session posts); Phase 5 keeps the signature when the bodies
// come from the database.

const FENCE_PATTERN = /^(```|~~~)/;
const HEADING_PATTERN = /^#{1,6}\s+/;
const QUOTE_PATTERN = /^>\s?/;
const LIST_PATTERN = /^(?:[-*+]|\d+\.)\s+/;
const IMAGE_PATTERN = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK_PATTERN = /\[([^\]]*)\]\([^)]*\)/g;
const MARK_PATTERN = /[*_`]/g;
const SPACE_PATTERN = /\s+/g;
const ELLIPSIS = "…";

/** The first readable line of a body, truncated to `maxLength` with `…`. */
export function excerpt(body: string, maxLength: number): string {
  const line = body
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !FENCE_PATTERN.test(entry));
  if (line === undefined) return "";

  const plain = line
    .replace(HEADING_PATTERN, "")
    .replace(QUOTE_PATTERN, "")
    .replace(LIST_PATTERN, "")
    .replace(IMAGE_PATTERN, "$1")
    .replace(LINK_PATTERN, "$1")
    .replace(MARK_PATTERN, "")
    .replace(SPACE_PATTERN, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}${ELLIPSIS}`;
}
