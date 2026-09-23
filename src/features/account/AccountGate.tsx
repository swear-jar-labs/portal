import { Heading, Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { ShellPanel } from "@/features/shell";

// Account-only routes render this for guests instead of redirecting: the shell
// stays put and the next step (logon or register) is one click away.
export function AccountGate({ title }: { title: string }) {
  return (
    <ShellPanel title={title} closable>
      <Stack gap={8}>
        <Heading level={1}>{messages.account.gate.heading}</Heading>
        <Text>{messages.account.gate.text}</Text>
        <Stack gap={4}>
          <Text>
            <Link href="/login" underline>
              {messages.account.gate.logon}
            </Link>
          </Text>
          <Text>
            <Link href="/register" underline>
              {messages.account.gate.register}
            </Link>
          </Text>
        </Stack>
      </Stack>
    </ShellPanel>
  );
}
