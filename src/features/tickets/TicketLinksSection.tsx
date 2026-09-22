"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Button,
  Field,
  Form,
  Link,
  RemoveButton,
  Select,
  Stack,
  Text,
  type SelectOption,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useLoginPrompt, useShellSession } from "@/features/shell";
import { avatarFor } from "@/shared/members";
import { ticketLinkSchema, type TicketLinkInput } from "./schema";
import * as ticketStore from "./ticket-store";
import {
  ticketLinkKinds,
  ticketLinksAddButtonId,
  type TicketLink,
  type TicketLinkKind,
} from "./tickets";

const kindOptions: SelectOption<TicketLinkKind>[] = ticketLinkKinds.map((kind) => ({
  value: kind,
  label: kind.toUpperCase(),
}));

const emptyLinkInput: TicketLinkInput = { kind: "pr", url: "", label: "" };

export type TicketLinksSectionProps = {
  ticketId: string;
  initialLinks: readonly TicketLink[];
  composing: boolean;
  onComposeChange: (composing: boolean) => void;
  // The author, the assignee and the maintainers pin and unpin; the remove
  // controls stay hidden for everyone else.
  canManage: boolean;
};

export function TicketLinksSection({
  ticketId,
  initialLinks,
  composing,
  onComposeChange: setComposing,
  canManage,
}: TicketLinksSectionProps) {
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const state = useSyncExternalStore(
    ticketStore.subscribeTickets,
    ticketStore.ticketsSnapshot,
    ticketStore.ticketsServerSnapshot,
  );
  const links = useMemo(() => {
    const removed = new Set(state.removedLinks[ticketId] ?? []);
    return [...initialLinks, ...(state.sessionLinks[ticketId] ?? [])].filter(
      (entry) => !removed.has(entry.id),
    );
  }, [initialLinks, state.sessionLinks, state.removedLinks, ticketId]);
  const [values, setValues] = useState<TicketLinkInput>(emptyLinkInput);
  const [errors, setErrors] = useState<{ url?: string; label?: string }>({});

  function submit() {
    if (session === null) {
      requestLogin();
      return;
    }
    // The trigger hides for outsiders; the guard stays for a forced submit.
    if (!canManage) return;
    const parsed = ticketLinkSchema.safeParse(values);
    if (!parsed.success) {
      setErrors({
        url: parsed.error.issues.some((issue) => issue.path[0] === "url")
          ? messages.tickets.dossier.links.badUrl
          : undefined,
        label: parsed.error.issues.some((issue) => issue.path[0] === "label")
          ? messages.tickets.dossier.links.badLabel
          : undefined,
      });
      return;
    }
    // The database keeps one url per ticket: reject a duplicate before the mock
    // store does (it mirrors the same invariant silently).
    if (links.some((entry) => entry.url === parsed.data.url)) {
      setErrors({ url: messages.tickets.dossier.links.duplicate });
      return;
    }
    ticketStore.addTicketLink(ticketId, {
      ...parsed.data,
      addedBy: { user: session.user, avatar: avatarFor(session.user) },
    });
    setValues(emptyLinkInput);
    setErrors({});
    setComposing(false);
  }

  function cancel() {
    setValues(emptyLinkInput);
    setErrors({});
    setComposing(false);
    // The trigger stays mounted behind the form, so the keyboard returns at once.
    document.getElementById(ticketLinksAddButtonId)?.focus();
  }

  return (
    <Stack gap={6}>
      {links.length === 0 ? (
        <Text role="hint">{messages.tickets.dossier.links.empty}</Text>
      ) : (
        <Stack gap={4}>
          {links.map((entry) => (
            <Stack key={entry.id} direction="row" gap={6} align="center" wrap navRow>
              <Text as="span" role="hint">
                {entry.kind.toUpperCase()}
              </Text>
              <Link href={entry.url} external>
                {entry.label}
              </Link>
              {canManage ? (
                <RemoveButton
                  ariaLabel={`${messages.tickets.dossier.links.remove} ${entry.label}`}
                  onClick={() => ticketStore.removeTicketLink(ticketId, entry.id)}
                />
              ) : null}
            </Stack>
          ))}
        </Stack>
      )}
      {composing ? (
        <Form onSubmit={submit} onCancel={cancel} ariaLabel={messages.tickets.dossier.links.add}>
          <Stack gap={6}>
            <Select
              label={messages.tickets.dossier.links.kind}
              name="kind"
              value={values.kind}
              options={kindOptions}
              onChange={(kind) => setValues((current) => ({ ...current, kind }))}
              autoFocus
            />
            <Field
              label={messages.tickets.dossier.links.url}
              name="url"
              value={values.url}
              onChange={(url) => setValues((current) => ({ ...current, url }))}
              error={errors.url}
              required
            />
            <Field
              label={messages.tickets.dossier.links.label}
              name="label"
              value={values.label}
              onChange={(label) => setValues((current) => ({ ...current, label }))}
              error={errors.label}
              required
            />
            <Stack direction="row" gap={8} wrap navRow>
              <Button type="submit" variant="primary">
                {messages.tickets.dossier.links.submit}
              </Button>
              <Button onClick={cancel}>{messages.tickets.dossier.links.cancel}</Button>
            </Stack>
            <Text role="hint">{messages.tickets.dossier.links.hint}</Text>
          </Stack>
        </Form>
      ) : null}
    </Stack>
  );
}
