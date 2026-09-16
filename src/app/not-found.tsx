import { Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";

export default function NotFound() {
  return (
    <ShellPanel title={messages.shell.notFound.title}>
      <Stack gap={8}>
        <Heading level={1} tone="yellow">
          {messages.shell.notFound.heading}
        </Heading>
        <Text tone="dim">{messages.shell.notFound.hint}</Text>
      </Stack>
    </ShellPanel>
  );
}
