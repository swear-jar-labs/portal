import type { Element } from "hast";
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Heading, Link, List, Text, cx, type Tone } from "@swearjar/dos";
import { ALIGN_ATTRIBUTE, TONE_ATTRIBUTE, isTone, remarkToneDirectives } from "@/lib/markdown/tone";
import { MARKDOWN_SRC_PROTOCOLS } from "@/lib/markdown/protocols";
import { markdownSchema } from "@/lib/markdown/sanitize";
import styles from "./Markdown.module.css";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const ALIGN_CLASSES = { center: styles.center, right: styles.right } as const;
type MarkdownAlignment = keyof typeof ALIGN_CLASSES;

function isMarkdownAlignment(value: string): value is MarkdownAlignment {
  return Object.hasOwn(ALIGN_CLASSES, value);
}

function toneOf(node: Element | undefined): Tone | undefined {
  const value = node?.properties[TONE_ATTRIBUTE];
  return typeof value === "string" && isTone(value) ? value : undefined;
}

function alignClass(node: Element | undefined): string | undefined {
  const value = node?.properties[ALIGN_ATTRIBUTE];
  return typeof value === "string" && isMarkdownAlignment(value) ? ALIGN_CLASSES[value] : undefined;
}

function listItems(children: ReactNode): ReactNode[] {
  // mdast-util-to-hast separates list items with "\n" text nodes; List renders
  // one <li> per item, so only elements (the items) may become items.
  return Children.toArray(children).filter((child) => isValidElement(child));
}

function heading(level: HeadingLevel) {
  return function MarkdownHeading({ children, node }: ComponentProps<"h2"> & ExtraProps) {
    return (
      <Heading level={level} className={cx(styles.heading, alignClass(node))}>
        {children}
      </Heading>
    );
  };
}

const components: Components = {
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  h5: heading(5),
  h6: heading(6),
  p: ({ children, node }) => (
    <Text as="p" className={cx(styles.paragraph, alignClass(node))}>
      {children}
    </Text>
  ),
  span: ({ children, node }) => (
    <Text as="span" tone={toneOf(node)}>
      {children}
    </Text>
  ),
  strong: ({ children }) => (
    <Text as="strong" weight="bold">
      {children}
    </Text>
  ),
  em: ({ children }) => <Text as="em">{children}</Text>,
  a: ({ children, href }) => <Link href={href ?? ""}>{children}</Link>,
  ul: ({ children }) => <List items={listItems(children)} className={styles.paragraph} />,
  ol: ({ children }) => <List ordered items={listItems(children)} className={styles.paragraph} />,
  li: ({ children }) => <>{children}</>,
  pre: ({ children }) => <pre className={styles.codeBlock}>{children}</pre>,
  code: ({ children, className }) => <code className={cx(styles.code, className)}>{children}</code>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element -- markdown images carry no dimensions, and next/image would need width/height (or a loader config) per image.
    <img
      className={styles.image}
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      // Anti-hotlink hosts 403 foreign Referers but serve an empty one (and it
      // keeps our URLs private): the browser sends no Referer for these images.
      referrerPolicy="no-referrer"
    />
  ),
};

export type MarkdownProps = {
  children: string;
};

function markdownUrlTransform(value: string): string {
  // react-markdown drops unknown protocols before sanitize runs; the extra
  // protocols live in protocols.ts — anything else keeps the default verdict
  // (schemes compare case-insensitively, like the default does).
  const scheme = value.slice(0, value.indexOf(":")).toLowerCase();
  if (MARKDOWN_SRC_PROTOCOLS.some((protocol) => protocol === scheme)) return value;
  return defaultUrlTransform(value);
}

/** Shared Markdown pipeline for docs and posts: GFM + tone directives, sanitized. */
export function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkDirective, remarkToneDirectives]}
      rehypePlugins={[[rehypeSanitize, markdownSchema]]}
      components={components}
      urlTransform={markdownUrlTransform}
    >
      {children}
    </ReactMarkdown>
  );
}
