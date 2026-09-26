import { buildHelp, Button, Heading, Sprite, Stack, Text } from "@swearjar/dos";
import type { AppCommand, FileGroup } from "@/content/commands";
import { welcome } from "@/content/landing";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import styles from "./dialogs.module.css";

export function HelpBody({ commands }: { commands: readonly AppCommand[] }) {
  return (
    <Text as="div" className={styles.help}>
      {buildHelp(commands, messages.shell.dialogs.help)}
    </Text>
  );
}

export function ErrorBody({ coins }: { coins: number }) {
  return (
    <Stack gap={4}>
      <Text as="div" role="danger">
        {messages.shell.dialogs.error.headline}
      </Text>
      <Text as="div" role="accent">
        {messages.shell.dialogs.error.jar}
      </Text>
      <Text as="div" role="accent">
        {`${messages.shell.dialogs.error.jarTotal}: ${formatCount(coins, pluralForms.coin)}`}
      </Text>
      <Text as="div" role="hint">
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
        <Text key={item.command} as="div" role="positive">
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
      <Text as="div" role="accent">
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
      <Text as="div" role="hint">
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
      <Text as="div" role="hint">
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

export function LoginPromptBody({
  onLogon,
  onCancel,
}: {
  onLogon: () => void;
  onCancel: () => void;
}) {
  return (
    <Stack gap={8}>
      <Text as="div">{messages.shell.dialogs.login.text}</Text>
      <Text as="div" role="hint">
        {messages.shell.dialogs.login.hint}
      </Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="primary" className={styles.action} onClick={onLogon}>
          {messages.shell.dialogs.login.confirm}
        </Button>
        <Button className={styles.action} onClick={onCancel}>
          {messages.shell.dialogs.login.cancel}
        </Button>
      </Stack>
    </Stack>
  );
}

export function WelcomeBody({ onExplore, onHow }: { onExplore: () => void; onHow: () => void }) {
  return (
    <Stack gap={16} className={styles.welcome}>
      <Stack direction="row" align="center" gap={16} className={styles.welcomeHeader}>
        <Sprite name="jar" cell={4} decorative />
        <Stack gap={4}>
          <Heading level={2}>{welcome.heading}</Heading>
          <Text>{welcome.intro}</Text>
        </Stack>
      </Stack>
      <Text>{welcome.description}</Text>
      <Stack as="ul" gap={4} className={styles.welcomePlaces}>
        {welcome.places.map((place) => (
          <li key={place.name} className={styles.welcomePlace}>
            <Text as="span" role="accent">
              {place.name}
            </Text>
            <Text as="span">{place.description}</Text>
          </li>
        ))}
      </Stack>
      <Text role="hint">{welcome.footer}</Text>
      <Stack direction="row" gap={10} wrap>
        <Button variant="primary" className={styles.action} onClick={onExplore}>
          {welcome.explore}
        </Button>
        <Button className={styles.action} onClick={onHow}>
          {welcome.how}
        </Button>
      </Stack>
    </Stack>
  );
}
