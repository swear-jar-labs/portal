import type { Properties } from "hast";
import type { Data, Link, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import { mentionPattern } from "../mention-syntax";

// Contract with the Markdown component and the sanitize schema: mentions
// compile to links carrying `data-mention` (the property key
// hast-util-to-jsx-runtime turns into the `data-mention` attribute), resolved
// handles only — the component decides which handles link via `users`.
export const MENTION_ATTRIBUTE = "dataMention";

// Text inside these never becomes a mention: real links (including GFM
// autolinked emails), images and definitions stay untouched. Code needs no
// entry: fenced and inline code are their own mdast nodes, never text.
const SKIPPED_PARENTS = new Set(["link", "linkReference", "image", "imageReference", "definition"]);

export type RemarkMentionsOptions = {
  // The member route root (MEMBER_PATH, passed by the Markdown component so
  // the single constant stays in shared/members).
  basePath: string;
  // Lower-cased resolvable handles. Absent links every syntactic mention;
  // an empty set links none — the Markdown default, so docs never guess.
  users?: ReadonlySet<string>;
};

// `mdast-util-to-hast` reads `hName`/`hProperties` from `node.data`; its types
// augment `Data` only when that package is part of the program, so the bridge
// keeps its own shape and stays correct either way (see tone.ts).
interface MentionHastData extends Data {
  hProperties?: Properties;
}

function mentionLink(url: string, handle: string, label: string): Link {
  const node: Link = { type: "link", url, children: [{ type: "text", value: label }] };
  const data: MentionHastData = { ...node.data, hProperties: { [MENTION_ATTRIBUTE]: handle } };
  node.data = data;
  return node;
}

function splitText(value: string, basePath: string, users: ReadonlySet<string> | undefined) {
  const parts: (Text | Link)[] = [];
  let last = 0;
  let found = false;
  for (const match of value.matchAll(mentionPattern())) {
    const raw = match[1];
    if (raw === undefined) continue;
    const handle = raw.toLowerCase();
    if (users !== undefined && !users.has(handle)) continue;
    found = true;
    const at = match.index ?? 0;
    if (at > last) parts.push({ type: "text", value: value.slice(last, at) });
    parts.push(mentionLink(`${basePath}/${handle}`, handle, match[0]));
    last = at + match[0].length;
  }
  if (!found) return null;
  if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
  return parts;
}

/**
 * Turns resolvable `@handles` into member links. Unknown handles stay plain
 * text; callers pass the handles they resolved (see shared/mentions).
 */
export function remarkMentions(options: RemarkMentionsOptions) {
  const { basePath, users } = options;
  return (tree: Root): void => {
    if (users !== undefined && users.size === 0) return;
    visit(tree, "text", (node, index, parent) => {
      if (parent === undefined || typeof index !== "number") return;
      if (SKIPPED_PARENTS.has(parent.type)) return;
      const parts = splitText(node.value, basePath, users);
      if (parts === null) return;
      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
