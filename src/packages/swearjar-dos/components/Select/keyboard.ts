const LETTER_PATTERN = /^[a-z]$/i;

export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(index, 0), count - 1);
}

// Cycles through the options starting after the active one: typing keeps
// walking matches, like a native select.
export function typeaheadIndex(
  labels: readonly string[],
  activeIndex: number,
  key: string,
): number | undefined {
  if (!LETTER_PATTERN.test(key) || labels.length === 0) return undefined;
  const char = key.toLowerCase();
  for (let step = 1; step <= labels.length; step += 1) {
    const index = (activeIndex + step) % labels.length;
    const label = labels[index];
    if (label !== undefined && label.toLowerCase().startsWith(char)) return index;
  }
  return undefined;
}
