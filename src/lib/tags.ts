/** Shared content policy for Board, Readroom and Tickets. */
export const MAX_TAGS = 10;

// The tag pickers search by substring: the query never needs more than the
// longest label ("TypeScript", 10) with room to spare. One cap for every tag
// search box, wired as the input's maxLength.
export const MAX_TAG_QUERY_LENGTH = 32;

export function toggleTagSelection<T>(selected: readonly T[], tag: T): T[] {
  if (selected.includes(tag)) return selected.filter((current) => current !== tag);
  return selected.length < MAX_TAGS ? [...selected, tag] : [...selected];
}
