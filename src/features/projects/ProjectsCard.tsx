"use client";

import type { MouseEvent } from "react";
import { Card, Stack, Tag, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { formatAge } from "@/shared/age";
import { PROJECTS_PATH, projectPath, projectStatusTones, type Project } from "./projects";
import styles from "./projects.module.css";

export const projectCardId = (slug: string) => `project-card-${slug}`;

export type ProjectsCardProps = {
  project: Project;
  now: string;
  // The journal's freshest activity, collected from the board: an empty
  // journal (a plan so far) shows the stack alone.
  activityAt?: string;
  current?: boolean;
  onActivate: (event?: MouseEvent<HTMLElement>) => void;
};

export function ProjectsCard({
  project,
  now,
  activityAt,
  current = false,
  onActivate,
}: ProjectsCardProps) {
  const meta = [
    ...(project.stack === undefined ? [] : [project.stack]),
    ...(activityAt === undefined ? [] : [formatAge(activityAt, now, messages.projects.age)]),
  ];

  return (
    <Card
      id={projectCardId(project.slug)}
      title={project.name}
      className={styles.cardTitle}
      current={current}
      href={projectPath(project.slug)}
      onActivate={onActivate}
      metaPosition="before"
      metaInteractive
      meta={
        <Stack direction="row" gap={6} align="center" wrap>
          <MemberLink person={project.lead} sectionPath={PROJECTS_PATH} />
          {meta.length === 0 ? null : (
            <Text as="span" role="hint">
              {meta.join(" · ")}
            </Text>
          )}
        </Stack>
      }
      actions={
        <Stack direction="row" gap={6} align="center" wrap className={styles.cardDetails}>
          <Tag tone={projectStatusTones[project.status]}>
            {messages.projects.statuses[project.status]}
          </Tag>
        </Stack>
      }
    />
  );
}
