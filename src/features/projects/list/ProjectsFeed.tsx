"use client";

import type { MouseEvent } from "react";
import { Button, Heading, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import {
  PROJECTS_CARD_ATTR,
  PROJECT_PROPOSE_BUTTON_ID,
  projectStatuses,
  type Project,
} from "../model/projects";
import { ProjectsCard } from "./ProjectsCard";
import styles from "./ProjectsFeed.module.css";

export type ProjectsFeedProps = {
  projects: readonly Project[];
  now: string;
  currentSlug?: string;
  onActivate: (slug: Project["slug"], event?: MouseEvent<HTMLElement>) => void;
  onPropose: () => void;
};

/** The registry index: the ranked projects cut by lifecycle status. */
export function ProjectsFeed({
  projects,
  now,
  currentSlug,
  onActivate,
  onPropose,
}: ProjectsFeedProps) {
  const sections = projectStatuses
    .map((status) => ({
      status,
      entries: projects.filter((project) => project.status === status),
    }))
    .filter((section) => section.entries.length > 0);

  return (
    <Stack gap={8}>
      <Heading level={1} className="sr-only">
        {messages.projects.feed.heading}
      </Heading>

      <Stack direction="row" gap={8} align="center" wrap>
        <Text role="hint">{formatCount(projects.length, pluralForms.project)}</Text>
        <Stack navRow className={styles.proposeAction}>
          <Button id={PROJECT_PROPOSE_BUTTON_ID} variant="primary" onClick={onPropose}>
            {messages.projects.proposal.open}
          </Button>
        </Stack>
      </Stack>

      {sections.length === 0 ? (
        <Text role="hint">{messages.projects.feed.empty}</Text>
      ) : (
        sections.map((section) => (
          <Stack key={section.status} gap={8}>
            <Heading level={2}>{messages.projects.feed.sections[section.status]}</Heading>
            {section.entries.map((project) => (
              <article key={project.slug} {...{ [PROJECTS_CARD_ATTR]: "" }}>
                <Stack navRow>
                  <ProjectsCard
                    project={project}
                    now={now}
                    current={project.slug === currentSlug}
                    onActivate={(event) => onActivate(project.slug, event)}
                  />
                </Stack>
              </article>
            ))}
          </Stack>
        ))
      )}
    </Stack>
  );
}
