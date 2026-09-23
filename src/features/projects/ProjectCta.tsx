"use client";

import { Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";

/** The guest call under the project: registration comes before a Member application. */
export function ProjectCta() {
  const session = useShellSession();

  if (session !== null) return null;
  return (
    <Stack gap={4} navRow>
      <Text role="hint">{messages.projects.cta.guestText}</Text>
      <Link href="/register">{messages.projects.cta.register}</Link>
    </Stack>
  );
}
