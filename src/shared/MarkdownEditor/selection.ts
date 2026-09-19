// Pure caret edits for the Markdown editor: the component computes the next
// value and caret together, React commits the value, the caret lands after.

export type CaretEdit = {
  value: string;
  start: number;
  end: number;
};

/** Wraps [start, end) with a before/after pair; an empty range leaves a
 * collapsed caret between the pair. */
export function wrapRange(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): CaretEdit {
  const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
  if (start === end) {
    const caret = start + before.length;
    return { value: next, start: caret, end: caret };
  }
  return { value: next, start: start + before.length, end: end + before.length };
}

/** A code span for one line, a fence for many. */
export function wrapCode(value: string, start: number, end: number): CaretEdit {
  if (value.slice(start, end).includes("\n")) {
    return wrapFence(value, start, end);
  }
  return wrapRange(value, start, end, "`", "`");
}

/** A fenced code block, always. */
export function wrapFence(value: string, start: number, end: number): CaretEdit {
  return wrapRange(value, start, end, "```\n", "\n```");
}

/** Inserts text at the caret, replacing any selection. */
export function insertAt(value: string, start: number, end: number, text: string): CaretEdit {
  const next = value.slice(0, start) + text + value.slice(end);
  const caret = start + text.length;
  return { value: next, start: caret, end: caret };
}
