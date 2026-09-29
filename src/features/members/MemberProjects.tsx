"use client";

import type { MouseEvent } from "react";
import { Card, Stack, Tag } from "@swearjar/dos";
import { messages } from "@/content/messages";
import {
  projectCardId,
  projectPath,
  projectStatusTones,
  type Project,
} from "@/features/projects/contracts";
import { useOverlayPush } from "@/features/shell";

/** A member's projects as compact rows (title plus lifecycle): memberships
 * are few, so the profile lists every one, and the full feed card stays
 * where the registry is. Rows open the project as an overlay layer. */
export function MemberProjects({ projects }: { projects: readonly Project[] }) {
  const pushOverlay = useOverlayPush();

  const activate = (project: Project) => (event?: MouseEvent<HTMLElement>) => {
    pushOverlay(projectPath(project.slug), projectCardId(project.slug))(event);
  };

  return (
    <Stack gap={8}>
      {projects.map((project) => (
        <Card
          key={project.slug}
          id={projectCardId(project.slug)}
          title={project.name}
          href={projectPath(project.slug)}
          onActivate={activate(project)}
          meta={
            <Tag tone={projectStatusTones[project.status]}>
              {messages.projects.statuses[project.status]}
            </Tag>
          }
          metaPosition="before"
        />
      ))}
    </Stack>
  );
}
