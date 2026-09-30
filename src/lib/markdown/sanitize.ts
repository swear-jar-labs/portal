import { defaultSchema } from "rehype-sanitize";
import { MARKDOWN_SRC_PROTOCOLS } from "./protocols";
import { MENTION_ATTRIBUTE } from "./mentions";
import { ALIGN_ATTRIBUTE, TONE_ATTRIBUTE } from "./tone";

// The base schema follows GitHub: no arbitrary attributes. The tone pipeline adds
// two inert data attributes of its own, mentions add one; everything else stays
// locked down.
// Image sources follow protocols.ts (`blob:` included for the editor imitation).
const wildcardAttributes = defaultSchema.attributes?.["*"] ?? [];

export const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...wildcardAttributes, TONE_ATTRIBUTE, ALIGN_ATTRIBUTE, MENTION_ATTRIBUTE],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: [...MARKDOWN_SRC_PROTOCOLS],
  },
};
