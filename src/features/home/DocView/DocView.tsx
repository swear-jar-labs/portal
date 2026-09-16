import { Heading, Sprite, Stack, Text } from "@swearjar/dos";
import type { Doc } from "@/content/docs";
import { Markdown } from "../Markdown/Markdown";
import styles from "./DocView.module.css";

export type DocViewProps = {
  doc: Doc;
};

export function DocView({ doc }: DocViewProps) {
  return (
    <Stack gap={0} className={styles.doc}>
      {doc.hero ? (
        <Stack direction="row" align="center" gap={16} className={styles.hero}>
          <Sprite name="jar" cell={5} decorative />
          <Stack gap={6}>
            <Heading level={1}>{doc.hero.title}</Heading>
            <Text as="div" tone="cyan">
              {doc.hero.tagline}
            </Text>
          </Stack>
        </Stack>
      ) : (
        <Heading level={1} className="sr-only">
          {doc.title}
        </Heading>
      )}
      <Markdown>{doc.body}</Markdown>
    </Stack>
  );
}
