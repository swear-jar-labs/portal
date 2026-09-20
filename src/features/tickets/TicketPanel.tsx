import { Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { projectPath } from "@/features/projects/contracts";
import { type ReadroomRef } from "@/features/readroom/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { TicketLinksSection } from "./TicketLinksSection";
import { TICKETS_PATH, ticketStatusTones, ticketTagTones, type Ticket } from "./tickets";
import styles from "./tickets.module.css";

export type TicketPanelProps = {
  ticket: Ticket;
  projectName: string;
  // The reverse list: readrooms reading this ticket's code (readroom-ticket-links).
  readrooms: readonly ReadroomRef[];
  now: string;
};

/** The ticket's RSC half: the header, the body, the code links, the comments
 * and the reading list — Markdown arrives rendered, the link form reads the
 * session in its own client island. */
export function TicketPanel({ ticket, projectName, readrooms, now }: TicketPanelProps) {
  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center" wrap>
        <Heading level={1}>{ticket.title}</Heading>
        <Tag tone={ticketStatusTones[ticket.status]}>
          {messages.tickets.statuses[ticket.status]}
        </Tag>
        <Tag>{ticket.size}</Tag>
      </Stack>
      <Text role="hint">{ticket.key}</Text>

      <Stack gap={4}>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.project}
          </Text>
          <Link href={projectPath(ticket.project)}>{projectName}</Link>
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.author}
          </Text>
          <MemberLink person={ticket.author} sectionPath={TICKETS_PATH} />
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.assignee}
          </Text>
          {ticket.assignee ? (
            <MemberLink person={ticket.assignee} sectionPath={TICKETS_PATH} />
          ) : (
            <Text as="span" role="hint">
              {messages.tickets.feed.unassigned}
            </Text>
          )}
        </Stack>
        <Stack direction="row" gap={6} align="center" wrap navRow>
          <Text as="span" role="hint">
            {messages.tickets.dossier.created}
          </Text>
          <Text as="span">{formatAge(ticket.createdAt, now, messages.tickets.age)}</Text>
          <Text as="span" role="hint">
            {messages.tickets.dossier.updated}
          </Text>
          <Text as="span">{formatAge(ticket.updatedAt, now, messages.tickets.age)}</Text>
          {ticket.closedAt === undefined ? null : (
            <>
              <Text as="span" role="hint">
                {messages.tickets.dossier.closed}
              </Text>
              <Text as="span">{formatAge(ticket.closedAt, now, messages.tickets.age)}</Text>
            </>
          )}
        </Stack>
        {ticket.tags.length === 0 ? null : (
          <Stack direction="row" gap={6} align="center" wrap navRow>
            <Text as="span" role="hint">
              {messages.tickets.dossier.tags}
            </Text>
            {ticket.tags.map((tag) => (
              <Tag key={tag} tone={ticketTagTones[tag]}>
                {messages.tickets.tags[tag]}
              </Tag>
            ))}
          </Stack>
        )}
      </Stack>

      <div className={styles.body}>
        <Markdown>{ticket.body}</Markdown>
      </div>

      <Stack gap={4}>
        <Heading level={2}>{messages.tickets.dossier.links.heading}</Heading>
        <TicketLinksSection ticketId={ticket.id} initialLinks={ticket.links} />
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>
          {messages.tickets.dossier.comments.heading} · {ticket.comments.length}
        </Heading>
        {ticket.comments.length === 0 ? (
          <Text role="hint">{messages.tickets.dossier.comments.empty}</Text>
        ) : (
          <Stack gap={6}>
            {ticket.comments.map((entry) => (
              <article key={entry.id} className={styles.comment}>
                <Stack direction="row" gap={6} align="center" wrap navRow>
                  <MemberLink person={entry.author} avatarSize="sm" sectionPath={TICKETS_PATH} />
                  <Text as="span" role="hint">
                    {formatAge(entry.createdAt, now, messages.tickets.age)}
                  </Text>
                </Stack>
                <Markdown>{entry.body}</Markdown>
              </article>
            ))}
          </Stack>
        )}
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.tickets.dossier.readrooms.heading}</Heading>
        {readrooms.length === 0 ? (
          <Text role="hint">{messages.tickets.dossier.readrooms.empty}</Text>
        ) : (
          <Stack gap={4}>
            {readrooms.map((entry) => (
              <Stack key={entry.id} navRow>
                <Link href={entry.path}>{entry.title}</Link>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
