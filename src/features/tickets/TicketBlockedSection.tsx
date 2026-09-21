"use client";

import { useMemo, useState } from "react";
import {
  Button,
  ComboBox,
  Form,
  Heading,
  Link,
  RemoveButton,
  Stack,
  Tag,
  Text,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { ticketBlockSchema } from "./schema";
import * as ticketStore from "./ticket-store";
import {
  isTicketKey,
  ticketBlockedSectionId,
  ticketPath,
  ticketStatusTones,
  ticketsById,
  wouldCycle,
  type Ticket,
} from "./tickets";

export type TicketBlockedSectionProps = {
  ticket: Ticket;
  // The whole queue: the form resolves a key and the cycle guard walks it.
  tickets: readonly Ticket[];
  composing: boolean;
  onComposeChange: (composing: boolean) => void;
  // The author, the assignee and the maintainers pin and unpin; the form and
  // the remove controls stay hidden for everyone else.
  canManage: boolean;
};

/** The dossier's BLOCKED BY section: the blockers as status chips with links,
 * and the form that pins or removes one. The cycle guard lives in the model;
 * the form only reports its verdict. The compose trigger lives in the panel's
 * action row above, so the section only renders the form. */
export function TicketBlockedSection({
  ticket,
  tickets,
  composing,
  onComposeChange: setComposing,
  canManage,
}: TicketBlockedSectionProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const byId = useMemo(() => ticketsById(tickets), [tickets]);
  const blockers = ticket.blockedBy.flatMap((id) => {
    const blocker = byId.get(id);
    return blocker === undefined ? [] : [blocker];
  });
  // The whole queue as pick options: the form still validates the typed key
  // (unknown, self, duplicate, cycle), the list only suggests.
  const keyOptions = useMemo(
    () => tickets.map((entry) => ({ value: entry.key, label: entry.key, hint: entry.title })),
    [tickets],
  );
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | undefined>();

  function submit() {
    if (session === null) {
      requestLogin();
      return;
    }
    // The trigger hides for outsiders; the guard stays for a forced submit.
    if (!canManage) return;
    const parsed = ticketBlockSchema.safeParse({ key });
    if (!parsed.success || !isTicketKey(parsed.data.key.toUpperCase())) {
      setError(messages.tickets.dossier.blocked.badKey);
      return;
    }
    const target = tickets.find((entry) => entry.key === parsed.data.key.toUpperCase());
    if (target === undefined) {
      setError(messages.tickets.dossier.blocked.unknown);
      return;
    }
    if (target.id === ticket.id) {
      setError(messages.tickets.dossier.blocked.self);
      return;
    }
    if (ticket.blockedBy.includes(target.id)) {
      setError(messages.tickets.dossier.blocked.duplicate);
      return;
    }
    if (wouldCycle(target.id, ticket.id, tickets)) {
      setError(messages.tickets.dossier.blocked.cycle);
      return;
    }
    ticketStore.setTicketBlockers(ticket.id, [...ticket.blockedBy, target.id]);
    setKey("");
    setError(undefined);
    setComposing(false);
  }

  function remove(blockerId: string) {
    ticketStore.setTicketBlockers(
      ticket.id,
      ticket.blockedBy.filter((id) => id !== blockerId),
    );
  }

  return (
    <Stack gap={6} id={ticketBlockedSectionId}>
      <Heading level={2}>{messages.tickets.dossier.blocked.heading}</Heading>
      {blockers.length === 0 ? (
        <Text role="hint">{messages.tickets.dossier.blocked.empty}</Text>
      ) : (
        <Stack gap={4}>
          {blockers.map((blocker) => (
            <Stack key={blocker.id} direction="row" gap={6} align="center" wrap navRow>
              <Tag tone={ticketStatusTones[blocker.status]}>
                {messages.tickets.statuses[blocker.status]}
              </Tag>
              <Link href={ticketPath(blocker.key)}>{blocker.key}</Link>
              <Text as="span" role="hint">
                {blocker.title}
              </Text>
              {canManage ? (
                <RemoveButton
                  ariaLabel={`${messages.tickets.dossier.blocked.remove} ${blocker.key}`}
                  onClick={() => remove(blocker.id)}
                />
              ) : null}
            </Stack>
          ))}
        </Stack>
      )}
      {composing ? (
        <Form onSubmit={submit} ariaLabel={messages.tickets.dossier.blocked.add}>
          <Stack gap={6}>
            <ComboBox
              label={messages.tickets.dossier.blocked.key}
              name="key"
              value={key}
              onChange={setKey}
              options={keyOptions}
              emptyText={messages.tickets.dossier.blocked.noMatch}
              error={error}
              required
            />
            <Stack direction="row" gap={8} wrap navRow>
              <Button type="submit" variant="primary">
                {messages.tickets.dossier.blocked.submit}
              </Button>
              <Button
                onClick={() => {
                  setKey("");
                  setError(undefined);
                  setComposing(false);
                }}
              >
                {messages.tickets.dossier.blocked.cancel}
              </Button>
            </Stack>
            <Text role="hint">{messages.tickets.dossier.blocked.hint}</Text>
          </Stack>
        </Form>
      ) : null}
    </Stack>
  );
}
