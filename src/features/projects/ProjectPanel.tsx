import { Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { FEED_PATH, JournalRows, type ThreadSummary } from "@/features/board/contracts";
import { MemberLink } from "@/features/members/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { ProjectCta } from "./ProjectCta";
import { PROJECTS_PATH, projectStatusTones, type Project } from "./projects";
import styles from "./projects.module.css";
export type ProjectPanelProps = {
  project: Project;
  journal: readonly ThreadSummary[];
  now: string;
};

function ForgeBlock({ project, now }: { project: Project; now: string }) {
  const stats = project.stats;
  if (stats === undefined) {
    return <Text role="hint">{messages.projects.forge.empty}</Text>;
  }
  return (
    <Stack gap={4}>
      <Stack direction="row" gap={6} align="center" wrap navRow>
        {project.repoUrl === undefined ? null : (
          <>
            <Text as="span" role="hint">
              {messages.projects.forge.repository}
            </Text>
            <Link href={project.repoUrl} external>
              {project.repoUrl}
            </Link>
          </>
        )}
        {project.status === "archived" ? <Tag>{messages.projects.forge.frozen}</Tag> : null}
      </Stack>
      <div className={styles.specs}>
        <Text role="hint">{messages.projects.forge.openPrs}</Text>
        <Text as="span">{stats.openPrs}</Text>
        <Text role="hint">{messages.projects.forge.merged}</Text>
        <Text as="span">{stats.merged30d}</Text>
        <Text role="hint">{messages.projects.forge.commits}</Text>
        <Text as="span">{stats.commits7d}</Text>
        {stats.release === undefined ? null : (
          <>
            <Text role="hint">{messages.projects.forge.release}</Text>
            <Text as="span">
              {stats.release.tag}{" "}
              <Text as="span" role="hint">
                {formatAge(stats.release.at, now, messages.projects.age)}
              </Text>
            </Text>
          </>
        )}
        <Text role="hint">{messages.projects.forge.activity}</Text>
        <Text as="span">{formatAge(stats.lastActivityAt, now, messages.projects.age)}</Text>
        <Text role="hint">{messages.projects.forge.synced}</Text>
        <Text as="span">{formatAge(stats.syncedAt, now, messages.projects.age)}</Text>
      </div>
    </Stack>
  );
}

/** The project's RSC half: the header, description, forge counters and the
 * related threads — Markdown and the member links arrive rendered, the CTA
 * reads the session in its own client island. */
export function ProjectPanel({ project, journal, now }: ProjectPanelProps) {
  const journalHref = `${FEED_PATH}?board=${project.slug}`;

  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center" wrap>
        <Heading level={1}>{project.name}</Heading>
        <Tag tone={projectStatusTones[project.status]}>
          {messages.projects.statuses[project.status]}
        </Tag>
      </Stack>

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
          <Stack direction="row" gap={6} align="center" wrap navRow>
            <Text as="span" role="hint">
              {messages.projects.about.lead}
            </Text>
            <MemberLink person={project.lead} sectionPath={PROJECTS_PATH} />
          </Stack>
          {project.maintainers.length === 0 ? null : (
            <Stack direction="row" gap={6} align="center" wrap navRow>
              <Text as="span" role="hint">
                {messages.projects.about.maintainers}
              </Text>
              {project.maintainers.map((person) => (
                <MemberLink key={person.user} person={person} sectionPath={PROJECTS_PATH} />
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.projects.forge.heading}</Heading>
        <ForgeBlock project={project} now={now} />
      </Stack>

      <Stack gap={6}>
        <Heading level={2}>{messages.projects.journal.heading}</Heading>
        {journal.length === 0 ? (
          <Text role="hint">{messages.projects.journal.empty}</Text>
        ) : (
          <JournalRows
            board={project.slug}
            threads={journal}
            now={now}
            sectionPath={PROJECTS_PATH}
          />
        )}
        <Stack navRow>
          <Link href={journalHref}>{messages.projects.journal.allThreads}</Link>
        </Stack>
      </Stack>

      <ProjectCta />
    </Stack>
  );
}
