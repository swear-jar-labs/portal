import { Stack, Text, cx } from "@swearjar/dos";
import { bootLines, bootSkip, bootTitle } from "@/content/landing";
import styles from "./DosShell.module.css";

export type BootScreenProps = {
  revealed: number;
  closing: boolean;
};

export function BootScreen({ revealed, closing }: BootScreenProps) {
  return (
    <Stack
      as="main"
      align="center"
      justify="center"
      className={cx(styles.bootScreen, closing && styles.bootDone)}
    >
      <Stack gap={0}>
        <Text as="div" className={styles.bootTitle}>
          {bootTitle}
        </Text>
        {bootLines.map((line, index) => (
          <Text
            key={line.id}
            as="div"
            className={cx(styles.bootLine, revealed > index && styles.bootLineShown)}
          >
            {line.text}
            {line.status ? (
              <>
                {" "}
                <Text as="span" tone={line.status.tone}>
                  {line.status.text}
                </Text>
              </>
            ) : null}
          </Text>
        ))}
        <Text
          as="div"
          className={cx(styles.bootSkip, revealed > bootLines.length && styles.bootLineShown)}
        >
          {bootSkip}
        </Text>
      </Stack>
    </Stack>
  );
}
