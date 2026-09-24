"use client";

import { useState, type ReactNode } from "react";
import { SegmentedControl, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { projectTabPath, projectTabs, type ProjectSlug, type ProjectTab } from "./projects";

const TAB_IDS = {
  project: "project-tab-project",
  team: "project-tab-team",
  activity: "project-tab-activity",
} as const;
const PANEL_IDS = {
  project: "project-panel-project",
  team: "project-panel-team",
  activity: "project-panel-activity",
} as const;
const TABS = projectTabs.map((tab) => ({
  value: tab,
  label: messages.projects.tabs[tab],
  id: TAB_IDS[tab],
  panelId: PANEL_IDS[tab],
}));

export function ProjectWorkspace({
  slug,
  initialTab,
  project,
  team,
  activity,
}: {
  slug: ProjectSlug;
  initialTab: ProjectTab;
  project: ReactNode;
  team: ReactNode;
  activity: ReactNode;
}) {
  const [tab, setTab] = useState<ProjectTab>(initialTab);
  // The tab is client state; the URL keeps it deep-linkable without a router
  // navigation (a router navigation to the same route would match the overlay
  // interceptor and hijack the page). Mirrors the board's replaceState canon.
  function select(next: ProjectTab) {
    setTab(next);
    window.history.replaceState(window.history.state, "", projectTabPath(slug, next));
  }

  return (
    <Stack gap={12}>
      <SegmentedControl
        mode="tabs"
        label={messages.projects.tabsLabel}
        options={TABS}
        value={tab}
        onChange={select}
      />
      <div
        id={PANEL_IDS.project}
        role="tabpanel"
        aria-labelledby={TAB_IDS.project}
        hidden={tab !== "project"}
      >
        {project}
      </div>
      <div
        id={PANEL_IDS.team}
        role="tabpanel"
        aria-labelledby={TAB_IDS.team}
        hidden={tab !== "team"}
      >
        {team}
      </div>
      <div
        id={PANEL_IDS.activity}
        role="tabpanel"
        aria-labelledby={TAB_IDS.activity}
        hidden={tab !== "activity"}
      >
        {activity}
      </div>
    </Stack>
  );
}
