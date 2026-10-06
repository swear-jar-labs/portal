"use client";

import type { MouseEvent } from "react";
import { Card, FileIcon, Link, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { techTagTone } from "@/content/techs";
import { MemberLink } from "@/features/members/contracts";
import { formatAge } from "@/shared/age";
import { projectCardId, projectPath, projectStatusTones, type Project } from "../model/projects";
import styles from "../projects.module.css";
import { ProjectScreenshotTiles } from "../detail/ProjectScreenshots";

export { projectCardId };

export type ProjectsCardProps = {
  project: Project;
  now: string;
  current?: boolean;
  eagerScreenshot?: boolean;
  // The profile rows reuse the feed card without the gallery: the same
  // byline, excerpt, site link and stack chips, but no screenshots.
  hideScreenshots?: boolean;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
};

export function ProjectsCard({
  project,
  now,
  current = false,
  eagerScreenshot = false,
  hideScreenshots = false,
  onActivate,
}: ProjectsCardProps) {
  return (
    <Card
      id={projectCardId(project.slug)}
      title={project.name}
      className={styles.cardTitle}
      current={current}
      href={projectPath(project.slug)}
      onActivate={onActivate}
      leading={
        <Stack direction="row" gap={6} align="center">
          <FileIcon kind="exe" icon="box" />
        </Stack>
      }
      metaPosition="before"
      metaInteractive
      meta={
        <Stack direction="row" gap={6} align="center" wrap>
          {project.lead ? (
            <MemberLink person={project.lead} />
          ) : (
            <Text as="span" role="danger">
              {messages.projects.team.leadVacant}
            </Text>
          )}
          <Text as="span" role="hint">
            {formatAge(project.createdAt, now, messages.projects.age)}
          </Text>
        </Stack>
      }
      actions={
        <div className={styles.below}>
          <Text role="hint" className={styles.excerpt}>
            {project.description}
          </Text>
          {project.siteUrl === undefined ? null : (
            <Link href={project.siteUrl} external className={styles.site}>
              {project.siteUrl}
            </Link>
          )}
          <Stack direction="row" gap={6} align="center" wrap className={styles.cardDetails}>
            <Tag tone={projectStatusTones[project.status]}>
              {messages.projects.statuses[project.status]}
            </Tag>
            {project.techs.map((tech) => (
              <Tag key={tech} tone={techTagTone}>
                {messages.readroom.tags[tech]}
              </Tag>
            ))}
          </Stack>
          {hideScreenshots ? null : project.screenshots?.length ? (
            <ProjectScreenshotTiles
              screenshots={project.screenshots.slice(0, 2)}
              compact
              eagerFirst={eagerScreenshot}
            />
          ) : null}
        </div>
      }
    />
  );
}
