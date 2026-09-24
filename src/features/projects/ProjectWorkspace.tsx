"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  function select(tab: ProjectTab) {
    router.replace(projectTabPath(slug, tab), { scroll: false });
  }

  return (
    <Stack gap={12}>
      <SegmentedControl
        mode="tabs"
        label={messages.projects.tabsLabel}
        options={TABS}
        value={initialTab}
        onChange={select}
      />
      <div
        id={PANEL_IDS.project}
        role="tabpanel"
        aria-labelledby={TAB_IDS.project}
        hidden={initialTab !== "project"}
      >
        {project}
      </div>
      <div
        id={PANEL_IDS.team}
        role="tabpanel"
        aria-labelledby={TAB_IDS.team}
        hidden={initialTab !== "team"}
      >
        {team}
      </div>
      <div
        id={PANEL_IDS.activity}
        role="tabpanel"
        aria-labelledby={TAB_IDS.activity}
        hidden={initialTab !== "activity"}
      >
        {activity}
      </div>
    </Stack>
  );
}
