"use client";

import { useState, type ReactNode } from "react";
import { SegmentedControl, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";

type AdminTab = "members" | "projects";
const TAB_IDS = { members: "admin-tab-members", projects: "admin-tab-projects" } as const;
const PANEL_IDS = { members: "admin-panel-members", projects: "admin-panel-projects" } as const;
const TABS = (["members", "projects"] as const).map((tab) => ({
  value: tab,
  label: messages.admin.tabs[tab],
  id: TAB_IDS[tab],
  panelId: PANEL_IDS[tab],
}));

export function AdminWorkspace({
  memberQueue,
  projectQueue,
}: {
  memberQueue: ReactNode;
  projectQueue: ReactNode;
}) {
  const [active, setActive] = useState<AdminTab>("members");

  return (
    <Stack gap={12}>
      <SegmentedControl
        mode="tabs"
        label={messages.admin.tabsLabel}
        options={TABS}
        value={active}
        onChange={setActive}
      />
      <div
        id={PANEL_IDS.members}
        role="tabpanel"
        aria-labelledby={TAB_IDS.members}
        hidden={active !== "members"}
      >
        {memberQueue}
      </div>
      <div
        id={PANEL_IDS.projects}
        role="tabpanel"
        aria-labelledby={TAB_IDS.projects}
        hidden={active !== "projects"}
      >
        {projectQueue}
      </div>
    </Stack>
  );
}
