import { buildHelp, Heading, Sprite, Stack, Text } from "@swearjar/dos";
import { commands, fileGroups } from "@/content/commands";
import { welcome } from "@/content/landing";

const fileList = fileGroups.flatMap((group) => group.items);

export function HelpBody() {
  return <Text as="div">{buildHelp(commands)}</Text>;
}

export function ErrorBody() {
  return (
    <Stack gap={4}>
      <Text as="div" tone="red" weight="bold">
        Bad command or file name.
      </Text>
      <Text as="div" tone="yellow">
        The jar clinks. +1 coin.
      </Text>
      <Text as="div" tone="dim">
        Try HELP.
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
      <Text as="div">This is the only OS DOOM has not been ported to yet.</Text>
      <Text as="div" tone="yellow">
        But if you wish, you can take this on — APPLY.
      </Text>
    </Stack>
  );
}

export function ExitBody() {
  return (
    <Stack gap={4}>
      <Text as="div" tone="red">
        There is no exit, as there is no logon.
      </Text>
      <Text as="div" tone="dim">
        Type LOGON to sign in.
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
