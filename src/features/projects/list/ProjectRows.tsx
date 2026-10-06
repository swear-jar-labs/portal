"use client";

import type { MouseEvent } from "react";
import { Stack } from "@swearjar/dos";
import { useOverlayPush } from "@/features/shell";
import { projectCardId, projectPath, type Project } from "../model/projects";
import { ProjectsCard } from "./ProjectsCard";

export type ProjectRowsProps = {
  projects: readonly Project[];
  now: string;
};

/** A member's projects as the registry's feed cards without the gallery
 * (ThreadRows/ReadroomRows reuse their feed cards the same way).
 * Memberships are few, so the profile lists every one. Rows open the project
 * as an overlay layer through a plain SPA push (modified clicks keep the
 * native tab behavior). */
export function ProjectRows({ projects, now }: ProjectRowsProps) {
  const pushOverlay = useOverlayPush();

  const activate = (project: Project) => (event?: MouseEvent<HTMLElement>) => {
    // The profile stays mounted under the root-slot intercept, so the row
    // card is a valid focus target when the overlay peels.
    pushOverlay(projectPath(project.slug), projectCardId(project.slug))(event);
  };

  return (
    <Stack gap={8}>
      {projects.map((project) => (
        <ProjectsCard
          key={project.slug}
          project={project}
          now={now}
          hideScreenshots
          onActivate={activate(project)}
        />
      ))}
    </Stack>
  );
}
