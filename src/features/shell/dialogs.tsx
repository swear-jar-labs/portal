import type { ReactNode } from "react";
import { useState } from "react";
import { buildHelp, Button, Stack, Text } from "@swearjar/dos";
import type { AppCommand, FileGroup } from "@/content/commands";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { recentEvents, topBadCommands, type JarEvent } from "./model/jar";
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

export function JarDialogBody({
  events,
  rows,
  onOpenErrata,
  onOpenBugs,
}: {
  events: readonly JarEvent[];
  /** Section-owned stat rows (Errata, Bugs), composed by the layout. */
  rows?: ReactNode;
  onOpenErrata: () => void;
  onOpenBugs: () => void;
}) {
  const copy = messages.shell.dialogs.jar;
  // Frozen at open: the dialog reports the moment it was asked, and the
  // command line behind it stays disabled while it is up.
  const [now] = useState(() => Date.now());
  const recent = recentEvents(events, now);
  const top = topBadCommands(events, now);
  return (
    <Stack gap={4}>
      <Text as="div" role="accent">
        {events.length === 0
          ? copy.empty
          : `${formatCount(events.length, pluralForms.coin)}. ${copy.progress}`}
      </Text>
      <Text as="div" role="hint">
        {copy.window}
      </Text>
      {rows}
      <Text as="div">{`${copy.badCommands}: ${recent.length}`}</Text>
      {top.length > 0 ? (
        <Text as="div" role="hint">
          {copy.topMisses}
        </Text>
      ) : null}
      {top.map((miss) => (
        <Text key={miss.raw} as="div">
          {`  ${miss.raw}: ${miss.count}`}
        </Text>
      ))}
      <Stack direction="row" gap={10} wrap>
        <Button className={styles.action} onClick={onOpenBugs}>
          {copy.openBugs}
        </Button>
        <Button className={styles.action} onClick={onOpenErrata}>
          {copy.openErrata}
        </Button>
      </Stack>
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
