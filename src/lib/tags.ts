/** Shared content policy for Board, Readroom and Tickets. */
export const MAX_TAGS = 10;

export function toggleTagSelection<T>(selected: readonly T[], tag: T): T[] {
  if (selected.includes(tag)) return selected.filter((current) => current !== tag);
  return selected.length < MAX_TAGS ? [...selected, tag] : [...selected];
}
