"use client";

import { Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";

/** The guest call under the project: members already have ALL THREADS above,
 * guests are pointed at APPLY — composing itself lives in Discussions. */
export function ProjectCta() {
  const session = useShellSession();

  if (session !== null) return null;
  return (
    <Stack gap={4} navRow>
      <Text role="hint">{messages.projects.cta.guestText}</Text>
      <Link href="/apply">{messages.projects.cta.apply}</Link>
    </Stack>
  );
}
