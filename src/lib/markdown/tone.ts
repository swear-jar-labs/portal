import type { Properties } from "hast";
import type { Data, Heading, Paragraph, Root } from "mdast";
import type { TextDirective } from "mdast-util-directive";
import { visit } from "unist-util-visit";
import { toneColor, type Tone } from "@swearjar/dos";

// Contract with the Markdown component and the sanitize schema: tone directives
// compile to `<span data-tone>` (the property key hast-util-to-jsx-runtime turns
// into the `data-tone` attribute), alignment — to `data-align` on the block.
export const TONE_ATTRIBUTE = "dataTone";
export const ALIGN_ATTRIBUTE = "dataAlign";

const ALIGNMENTS = ["left", "center", "right"] as const;
type MarkdownAlign = (typeof ALIGNMENTS)[number];

export function isTone(value: string): value is Tone {
  return Object.hasOwn(toneColor, value);
}

function isMarkdownAlign(value: string | null | undefined): value is MarkdownAlign {
  return ALIGNMENTS.some((alignment) => alignment === value);
}

// `mdast-util-to-hast` reads `hName`/`hProperties` from `node.data`; its types
// augment `Data` only when that package is part of the program, so the bridge
// keeps its own shape and stays correct either way.
interface ToHastData extends Data {
  hName?: string;
  hProperties?: Properties;
}

function mergeHastData(node: { data?: Data }, data: ToHastData): void {
  const merged: ToHastData = { ...node.data, ...data };
  node.data = merged;
}

function isSoleContent(parent: Paragraph | Heading, node: TextDirective): boolean {
  return parent.children.every(
    (child) => child === node || (child.type === "text" && child.value.trim() === ""),
  );
}

/**
 * Turns tone directives into tone spans: `:cyan[text]` and `:cyan[**text**]`.
 * `{align="right"}` on a directive that fills its paragraph or heading aligns
 * the block; on any other directive it is ignored. Unknown directives (say, a
 * typo in a post) degrade to their content instead of breaking the render.
 */
export function remarkToneDirectives() {
  return (tree: Root): void => {
    visit(tree, "textDirective", (node, index, parent) => {
      if (!isTone(node.name)) {
        if (parent && typeof index === "number") {
          parent.children.splice(index, 1, ...node.children);
          return index;
        }
        return;
      }

      const align = node.attributes?.align;
      if (
        isMarkdownAlign(align) &&
        parent &&
        (parent.type === "paragraph" || parent.type === "heading") &&
        isSoleContent(parent, node)
      ) {
        mergeHastData(parent, { hProperties: { [ALIGN_ATTRIBUTE]: align } });
      }

      mergeHastData(node, { hName: "span", hProperties: { [TONE_ATTRIBUTE]: node.name } });
    });
  };
}
