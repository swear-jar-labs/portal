import { Heading, List, Sprite, Stack, Text, cx } from "@swearjar/dos";
import { Fragment } from "react";
import type { Block, Doc, Inline } from "@/content/landing";
import styles from "./DocView.module.css";

function renderInline(node: Inline, index: number) {
  return (
    <Text key={index} as="span" tone={node.tone} weight={node.bold ? "bold" : "normal"}>
      {node.text}
    </Text>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled block type: ${JSON.stringify(value)}`);
}

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case "hero":
      return (
        <Stack key={index} direction="row" align="center" gap={16} className={styles.hero}>
          <Sprite name="jar" cell={5} decorative />
          <Stack gap={6}>
            <Heading level={1}>{block.title}</Heading>
            <Text as="div" tone="cyan">
              {block.tagline}
            </Text>
          </Stack>
        </Stack>
      );
    case "heading":
      return (
        <Heading
          key={index}
          level={2}
          tone={block.tone}
          className={cx(styles.centered, styles.heading)}
        >
          {block.text}
        </Heading>
      );
    case "paragraph":
      return (
        <Text
          key={index}
          as="p"
          tone={block.tone}
          align={block.align === "right" ? "right" : undefined}
          className={styles.paragraph}
        >
          {block.content.map(renderInline)}
        </Text>
      );
    case "list":
      return (
        <List
          key={index}
          className={styles.paragraph}
          items={block.items.map((item, itemIndex) => (
            <Fragment key={itemIndex}>{item.map(renderInline)}</Fragment>
          ))}
        />
      );
    default:
      return assertNever(block);
  }
}

export type DocViewProps = {
  doc: Doc;
  className?: string;
};

export function DocView({ doc, className }: DocViewProps) {
  const hasHero = doc.blocks.some((block) => block.type === "hero");

  return (
    <Stack gap={0} className={cx(styles.doc, className)}>
      {hasHero ? null : (
        <Heading level={1} className="sr-only">
          {doc.title}
        </Heading>
      )}
      {doc.blocks.map(renderBlock)}
    </Stack>
  );
}
