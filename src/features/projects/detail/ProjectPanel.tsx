import { Button, Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { FEED_PATH, JournalRows, type ThreadSummary } from "@/features/board/contracts";
import { TicketsOverlayTable, type Ticket } from "@/features/tickets/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { ProjectClaimSection } from "./ProjectClaimSection";
import { ProjectTeamSection } from "./ProjectTeamSection";
import { ProjectWorkspace } from "./ProjectWorkspace";
import { ProjectCta } from "./ProjectCta";
import { ProjectEditAction } from "./ProjectEditAction";
import { ProjectScreenshots } from "./ProjectScreenshots";
import type { ProjectTeam } from "../data/team-store";
import { projectStatusTones, type Project, type ProjectTab } from "../model/projects";
import styles from "../projects.module.css";
export type ProjectPanelProps = {
  project: Project;
  activeTab: ProjectTab;
  team: ProjectTeam;
  journal: readonly ThreadSummary[];
  tickets: readonly Ticket[];
  ticketCount: number;
  threadCount: number;
  now: string;
};

function RepositoryBlock({ project, now }: { project: Project; now: string }) {
  const stats = project.stats;
  if (stats === undefined) {
    return project.repoUrl ? (
      <Stack gap={4}>
        <Link href={project.repoUrl} external>
          {project.repoUrl}
        </Link>
        <Text role="hint">{messages.projects.repository.pending}</Text>
      </Stack>
    ) : (
      <Text role="hint">{messages.projects.repository.empty}</Text>
    );
  }
  return (
    <Stack gap={4}>
      <Stack direction="row" gap={6} align="center" wrap navRow>
        {project.repoUrl === undefined ? null : (
          <>
            <Text as="span" role="hint">
              {messages.projects.repository.url}
            </Text>
            <Link href={project.repoUrl} external>
              {project.repoUrl}
            </Link>
          </>
        )}
        {project.status === "archived" ? <Tag>{messages.projects.repository.frozen}</Tag> : null}
      </Stack>
      <div className={styles.specs}>
        <Text role="hint">{messages.projects.repository.openPrs}</Text>
        <Text as="span">{stats.openPrs}</Text>
        <Text role="hint">{messages.projects.repository.merged}</Text>
        <Text as="span">{stats.merged30d}</Text>
        <Text role="hint">{messages.projects.repository.commits}</Text>
        <Text as="span">{stats.commits7d}</Text>
        {stats.release === undefined ? null : (
          <>
            <Text role="hint">{messages.projects.repository.release}</Text>
            <Text as="span">
              {stats.release.tag}{" "}
              <Text as="span" role="hint">
                {formatAge(stats.release.at, now, messages.projects.age)}
              </Text>
            </Text>
          </>
        )}
        <Text role="hint">{messages.projects.repository.activity}</Text>
        <Text as="span">{formatAge(stats.lastActivityAt, now, messages.projects.age)}</Text>
        <Text role="hint">{messages.projects.repository.synced}</Text>
        <Text as="span">{formatAge(stats.syncedAt, now, messages.projects.age)}</Text>
      </div>
    </Stack>
  );
}

/** The project's RSC half: the header, description, repository counters and the
 * related threads — Markdown and the member links arrive rendered, the CTA
 * reads the session in its own client island. */
export function ProjectPanel({
  project,
  activeTab,
  team,
  journal,
  tickets,
  ticketCount,
  threadCount,
  now,
}: ProjectPanelProps) {
  const journalHref = `${FEED_PATH}?board=${project.slug}`;
  const newThreadHref = `${journalHref}&new=1`;
  const ticketsHref = `/tickets?project=${project.slug}`;
  const newTicketHref = `${ticketsHref}&new=1`;

  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center" wrap>
        <Stack direction="row" gap={8} align="center" wrap className={styles.projectHeaderTitle}>
          <Heading level={1} className={styles.projectHeaderName}>
            {project.name}
          </Heading>
          <Tag tone={projectStatusTones[project.status]}>
            {messages.projects.statuses[project.status]}
          </Tag>
        </Stack>
        <ProjectEditAction project={project} />
      </Stack>

      <ProjectWorkspace
        slug={project.slug}
        initialTab={activeTab}
        project={
          <Stack gap={12}>
            <Stack gap={4}>
              <Heading level={2}>{messages.projects.about.heading}</Heading>
              <Markdown>{project.description}</Markdown>
              <Stack gap={4}>
                {project.techs.length === 0 ? null : (
                  <Stack direction="row" gap={6} align="center" wrap navRow>
                    <Text as="span" role="hint">
                      {messages.projects.about.stack}
                    </Text>
                    {project.techs.map((tech) => (
                      <Tag key={tech}>{messages.readroom.tags[tech]}</Tag>
                    ))}
                  </Stack>
                )}
                {project.contributors ? (
                  <Text>
                    <Text as="span" role="hint">
                      {messages.projects.about.contributors}:{" "}
                    </Text>
                    {project.contributors}
                  </Text>
                ) : null}
              </Stack>
              <ProjectScreenshots
                screenshots={project.screenshots ?? []}
                eagerFirst={activeTab === "project"}
              />
            </Stack>
          </Stack>
        }
        repository={
          <Stack gap={4}>
            <Heading level={2}>{messages.projects.repository.heading}</Heading>
            <RepositoryBlock project={project} now={now} />
          </Stack>
        }
        team={
          <Stack gap={12}>
            <ProjectTeamSection project={project} team={team} />
            <ProjectClaimSection
              key={project.maintainers.map((person) => person.user).join(",")}
              slug={project.slug}
              base={project.claimPolicy}
              maintainers={project.maintainers.map((person) => person.user)}
            />
            <ProjectCta />
          </Stack>
        }
        activity={
          <Stack gap={12}>
            <Stack gap={6}>
              <Stack direction="row" gap={8} align="center" wrap navRow>
                <Heading level={2}>{messages.tickets.project.heading}</Heading>
                {project.status === "archived" ? null : (
                  <Button href={newTicketHref} variant="primary">
                    {messages.tickets.project.newTicket}
                  </Button>
                )}
              </Stack>
              {tickets.length === 0 ? (
                <Text role="hint">{messages.tickets.project.empty}</Text>
              ) : (
                <TicketsOverlayTable
                  tickets={tickets}
                  projectNames={{ [project.slug]: project.name }}
                  label={messages.tickets.project.heading}
                />
              )}
              <Stack navRow>
                <Link
                  href={ticketsHref}
                >{`${messages.tickets.project.all} (${ticketCount}) →`}</Link>
              </Stack>
            </Stack>

            <Stack gap={6}>
              <Stack direction="row" gap={8} align="center" wrap navRow>
                <Heading level={2}>{messages.projects.journal.heading}</Heading>
                {project.status === "archived" ? null : (
                  <Button href={newThreadHref} variant="primary">
                    {messages.board.feed.newThread}
                  </Button>
                )}
              </Stack>
              {journal.length === 0 ? (
                <Text role="hint">{messages.projects.journal.empty}</Text>
              ) : (
                <JournalRows board={project.slug} threads={journal} now={now} />
              )}
              <Stack navRow>
                <Link href={journalHref}>
                  {`${messages.projects.journal.allThreads} (${threadCount}) →`}
                </Link>
              </Stack>
            </Stack>
          </Stack>
        }
      />
    </Stack>
  );
}
