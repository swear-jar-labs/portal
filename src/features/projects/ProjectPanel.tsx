import { Heading, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { FEED_PATH, ThreadRows, type ThreadSummary } from "@/features/board/contracts";
import { MemberLink } from "@/features/members/contracts";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge } from "@/shared/age";
import { ProjectCta } from "./ProjectCta";
import { PROJECTS_PATH, projectStatusTones, type Project } from "./projects";

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
        {project.forge === undefined || project.repoUrl === undefined ? null : (
          <>
            <Tag>{messages.projects.forge.forges[project.forge]}</Tag>
            <Link href={project.repoUrl} external>
              {project.repoUrl}
            </Link>
          </>
        )}
        {project.status === "archived" ? <Tag>{messages.projects.forge.frozen}</Tag> : null}
      </Stack>
      <Text role="hint">
        {[
          `${messages.projects.forge.openPrs} ${stats.openPrs}`,
          `${messages.projects.forge.merged} ${stats.merged30d}`,
          `${messages.projects.forge.commits} ${stats.commits7d}`,
        ].join(" · ")}
      </Text>
      {stats.release === undefined ? null : (
        <Text role="hint">
          {`${messages.projects.forge.release} ${stats.release.tag} · ${formatAge(stats.release.at, now, messages.projects.age)}`}
        </Text>
      )}
      <Text role="hint">
        {[
          `${messages.projects.forge.activity} ${formatAge(stats.lastActivityAt, now, messages.projects.age)}`,
          `${messages.projects.forge.synced} ${formatAge(stats.syncedAt, now, messages.projects.age)}`,
        ].join(" · ")}
      </Text>
    </Stack>
  );
}

/** The project's RSC half: header, description, forge counters and the journal
 * preview — Markdown and the member links arrive rendered, the CTA reads the
 * session in its own client island. */
export function ProjectPanel({ project, journal, now }: ProjectPanelProps) {
  const journalHref = `${FEED_PATH}?board=${project.slug}`;

  return (
    <Stack gap={12}>
      <Stack gap={4}>
        <Heading level={1}>{project.name}</Heading>
        <Stack direction="row" gap={6} align="center" wrap>
          <Tag tone={projectStatusTones[project.status]}>
            {messages.projects.statuses[project.status]}
          </Tag>
        </Stack>
      </Stack>

      <Stack gap={4}>
        <Heading level={2}>{messages.projects.about.heading}</Heading>
        <Markdown>{project.description}</Markdown>
        <Stack gap={4}>
          {project.stack === undefined ? null : (
            <Text role="hint">{`${messages.projects.about.stack} ${project.stack}`}</Text>
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
          <ThreadRows threads={journal} now={now} />
        )}
        <Stack navRow>
          <Link href={journalHref}>{messages.projects.journal.allThreads}</Link>
        </Stack>
      </Stack>

      <ProjectCta journalHref={journalHref} />
    </Stack>
  );
}
