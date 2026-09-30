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

// The toolbar inserts a section heading (h2): h1 stays the page's own, the
// post structures itself below it. Any ATX prefix toggles back to plain
// text, so `# Title` from a paste also comes off with one press.
const HEADING_PREFIX = "## ";

const HEADING_PATTERN = /^(\s*)(#{1,6})(?:\s+|$)/;

/** Inserts text at the caret, replacing any selection. */
export function insertAt(value: string, start: number, end: number, text: string): CaretEdit {
  const next = value.slice(0, start) + text + value.slice(end);
  const caret = start + text.length;
  return { value: next, start: caret, end: caret };
}

/** Toggles an ATX heading on every line the range touches; blank lines stay
 * bare. Removing strips any `#{1,6}` prefix, adding inserts `## ` after the
 * indent. The caret keeps its place: before the insertion point it holds
 * still, past it rides the prefix. */
export function toggleHeading(value: string, start: number, end: number): CaretEdit {
  const lineStart = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  const blockEnd = value.indexOf("\n", end);
  const lineEnd = blockEnd === -1 ? value.length : blockEnd;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const headed = lines.every((line) => line.trim() === "" || HEADING_PATTERN.test(line));
  // A collapsed caret on a bare line starts a heading there instead of
  // no-op'ing on the blank-line rule below.
  const first = lines[0] ?? "";
  if (start === end && lines.length === 1 && first.trim() === "") {
    const indent = first.match(/^\s*/)?.[0] ?? "";
    const caret = lineStart + indent.length + HEADING_PREFIX.length;
    return {
      value: `${value.slice(0, lineStart)}${indent}${HEADING_PREFIX}${value.slice(lineEnd)}`,
      start: caret,
      end: caret,
    };
  }
  const nextLines = lines.map((line) => {
    if (line.trim() === "") return line;
    if (headed) return line.replace(HEADING_PATTERN, "$1");
    const indent = line.match(/^\s*/)?.[0] ?? "";
    return `${indent}${HEADING_PREFIX}${line.slice(indent.length)}`;
  });
  const next = value.slice(0, lineStart) + nextLines.join("\n") + value.slice(lineEnd);

  // Per-line caret ride: how far the text under the caret moved.
  const rides = lines.map((line) => {
    if (line.trim() === "") return { indent: 0, ride: 0 };
    if (headed) {
      const match = HEADING_PATTERN.exec(line);
      const prefix = match?.[0] ?? "";
      const indent = match?.[1] ?? "";
      return { indent: indent.length, ride: indent.length - prefix.length };
    }
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    return { indent, ride: HEADING_PREFIX.length };
  });

  function shift(offset: number): number {
    const lineIndex = value.slice(lineStart, offset).split("\n").length - 1;
    const lineOffset = lineStart + lines.slice(0, lineIndex).join("\n").length + lineIndex;
    const column = offset - lineOffset;
    // Out of range is unreachable (the offset sits inside the block), the
    // fallback only satisfies the strict index check.
    const { indent, ride } = rides[lineIndex] ?? { indent: 0, ride: 0 };
    // Inside the removed prefix the caret has nowhere to stay: it parks at
    // the line start instead of sliding into the line above.
    const nextColumn = Math.max(0, column + (column <= indent ? 0 : ride));
    return lineStart + nextLines.slice(0, lineIndex).join("\n").length + lineIndex + nextColumn;
  }
  return { value: next, start: shift(start), end: shift(end) };
}
