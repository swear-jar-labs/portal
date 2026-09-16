import { buildHelp, Button, Heading, Sprite, Stack, Text } from "@swearjar/dos";
import type { AppCommand, FileGroup } from "@/content/commands";
import { welcome } from "@/content/landing";
import { messages } from "@/content/messages";
import styles from "./dialogs.module.css";

export function HelpBody({ commands }: { commands: readonly AppCommand[] }) {
  return (
    <Text as="div" className={styles.help}>
      {buildHelp(commands, messages.shell.dialogs.help)}
    </Text>
  );
}

export function ErrorBody() {
  return (
    <Stack gap={4}>
      <Text as="div" tone="red" weight="bold">
        {messages.shell.dialogs.error.headline}
      </Text>
      <Text as="div" tone="yellow">
        {messages.shell.dialogs.error.jar}
      </Text>
      <Text as="div" tone="dim">
        {messages.shell.dialogs.error.hint}
      </Text>
    </Stack>
  );
}

export function DirBody({ groups }: { groups: readonly FileGroup[] }) {
  const fileList = groups.flatMap((group) => group.items);

  return (
    <Stack gap={2}>
      {fileList.map((item) => (
        <Text key={item.command} as="div" tone="green">
          {`  ${item.name}.${item.ext}`}
        </Text>
      ))}
    </Stack>
  );
}

export function DoomBody() {
  return (
    <Stack gap={4}>
      <Text as="div">{messages.shell.dialogs.doom.text}</Text>
      <Text as="div" tone="yellow">
        {messages.shell.dialogs.doom.hint}
      </Text>
    </Stack>
  );
}

export function ExitBody({ signedIn }: { signedIn: boolean }) {
  return (
    <Stack gap={4}>
      <Text as="div">
        {signedIn ? messages.shell.dialogs.exit.memberText : messages.shell.dialogs.exit.text}
      </Text>
      <Text as="div" tone="dim">
        {signedIn ? messages.shell.dialogs.exit.memberHint : messages.shell.dialogs.exit.hint}
      </Text>
    </Stack>
  );
}

export function LogoffBody({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Stack gap={8}>
      <Text as="div">{messages.shell.dialogs.logoff.text}</Text>
      <Text as="div" tone="dim">
        {messages.shell.dialogs.logoff.hint}
      </Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="primary" className={styles.action} onClick={onConfirm}>
          {messages.shell.dialogs.logoff.confirm}
        </Button>
        <Button className={styles.action} onClick={onCancel}>
          {messages.shell.dialogs.logoff.cancel}
        </Button>
      </Stack>
    </Stack>
  );
}

export function WelcomeBody() {
  return (
    <Stack direction="row" align="start" gap={18} wrap>
      <Sprite name="jar" cell={4} decorative />
      <Stack gap={6}>
        <Heading level={2} tone="yellow">
          {welcome.heading}
        </Heading>
        <Text>{welcome.intro}</Text>
        {welcome.lines.map((line) => (
          <Text key={line}>
            <Text as="span" tone="green">
              {"> "}
            </Text>
            {line}
          </Text>
        ))}
        <Text tone="dim">{welcome.footer}</Text>
      </Stack>
    </Stack>
  );
}
