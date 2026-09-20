"use client";

import { Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useShellSession } from "@/features/shell";

export type ProjectCtaProps = {
  journalHref: string;
};

/** The project's role-aware call: guests are pointed at APPLY, members at the
 * project's board — composing itself lives in Discussions. */
export function ProjectCta({ journalHref }: ProjectCtaProps) {
  const session = useShellSession();

  if (session === null) {
    return (
      <Stack gap={4} navRow>
        <Text role="hint">{messages.projects.cta.guestText}</Text>
        <Link href="/apply">{messages.projects.cta.apply}</Link>
      </Stack>
    );
  }
  return (
    <Stack gap={4} navRow>
      <Link href={journalHref}>{messages.projects.cta.open}</Link>
    </Stack>
  );
}
