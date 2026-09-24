"use client";

import type { MouseEvent } from "react";
import { Card, FileIcon, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { formatAge } from "@/shared/age";
import { projectPath, projectStatusTones, type Project } from "./projects";
import styles from "./projects.module.css";

export const projectCardId = (slug: string) => `project-card-${slug}`;

export type ProjectsCardProps = {
  project: Project;
  now: string;
  current?: boolean;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
};

export function ProjectsCard({ project, now, current = false, onActivate }: ProjectsCardProps) {
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
          <Stack direction="row" gap={6} align="center" wrap className={styles.cardDetails}>
            <Tag tone={projectStatusTones[project.status]}>
              {messages.projects.statuses[project.status]}
            </Tag>
            {project.techs.map((tech) => (
              <Tag key={tech}>{messages.readroom.tags[tech]}</Tag>
            ))}
          </Stack>
        </div>
      }
    />
  );
}
