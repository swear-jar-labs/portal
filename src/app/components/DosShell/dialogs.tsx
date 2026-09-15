import { buildHelp, Heading, Sprite, Stack, Text } from "@swearjar/dos";
import { commands, fileGroups } from "@/content/commands";
import { welcome } from "@/content/landing";
import { messages } from "@/content/messages";

const fileList = fileGroups.flatMap((group) => group.items);

export function HelpBody() {
  return <Text as="div">{buildHelp(commands, messages.shell.dialogs.help)}</Text>;
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

export function DirBody() {
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

export function ExitBody() {
  return (
    <Stack gap={4}>
      <Text as="div" tone="red">
        {messages.shell.dialogs.exit.text}
      </Text>
      <Text as="div" tone="dim">
        {messages.shell.dialogs.exit.hint}
      </Text>
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
