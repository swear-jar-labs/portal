"use client";

import { useState } from "react";
import { Button, Heading, Select, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useOverlayPush } from "@/features/shell";
import { projectTeamManagePath, type Project } from "@/features/projects/contracts";
import styles from "./AdminQueue.module.css";

const copy = messages.admin.teams;

const FILTER_ALL = "all";
const FILTER_NO_MAINTAINER = "no-maintainer";
const FILTERS = [FILTER_ALL, FILTER_NO_MAINTAINER] as const;
type TeamFilter = (typeof FILTERS)[number];
const FILTER_LABELS: Record<TeamFilter, string> = {
  [FILTER_ALL]: copy.filterAll,
  [FILTER_NO_MAINTAINER]: copy.filterNoMaintainer,
};

// The focus-return anchor of the queue row's MANAGE TEAM button.
const adminManageButtonId = (slug: string) => `admin-manage-${slug}`;

export function AdminProjectTeams({ projects }: { projects: readonly Project[] }) {
  const [filter, setFilter] = useState<TeamFilter>(FILTER_ALL);
  const pushOverlay = useOverlayPush();
  const live = projects.filter((project) => project.status !== "archived");
  const visible =
    filter === FILTER_NO_MAINTAINER
      ? live.filter((project) => project.maintainers.length === 0)
      : live;
  return (
    <Stack gap={12}>
      <Heading level={1}>{copy.heading}</Heading>
      <Text>{copy.intro}</Text>
      {live.length > 0 ? (
        <Select
          label={copy.filter}
          name="admin-team-filter"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((value) => ({ value, label: FILTER_LABELS[value] }))}
        />
      ) : null}
      {live.length === 0 ? (
        <Text role="hint">{copy.empty}</Text>
      ) : visible.length === 0 ? (
        <Text role="hint">{copy.filteredEmpty}</Text>
      ) : null}
      {visible.map((project) => (
        <section key={project.slug} aria-label={project.name} className={styles.application}>
          <Stack gap={6}>
            <Heading level={2}>{project.name}</Heading>
            {project.maintainers.length === 0 ? (
              <Text role="danger">{messages.projects.team.noMaintainer}</Text>
            ) : (
              <Text>{`${messages.projects.about.maintainers}: ${project.maintainers.map((person) => person.user).join(", ")}`}</Text>
            )}
            {project.lead === null ? (
              <Text role="danger">{messages.projects.team.leadVacant}</Text>
            ) : null}
            <Button
              id={adminManageButtonId(project.slug)}
              href={projectTeamManagePath(project.slug)}
              // The management layer opens above the admin page (the fallback
              // host renders it): the queue keeps its state behind.
              onClick={pushOverlay(
                projectTeamManagePath(project.slug),
                adminManageButtonId(project.slug),
              )}
            >
              {messages.projects.team.manage}
            </Button>
          </Stack>
        </section>
      ))}
    </Stack>
  );
}
