import { defaultSchema } from "rehype-sanitize";
import { ALIGN_ATTRIBUTE, TONE_ATTRIBUTE } from "./tone";

// The base schema follows GitHub: no arbitrary attributes. The tone pipeline adds
// two inert data attributes of its own; everything else stays locked down.
const wildcardAttributes = defaultSchema.attributes?.["*"] ?? [];

export const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...wildcardAttributes, TONE_ATTRIBUTE, ALIGN_ATTRIBUTE],
  },
};
