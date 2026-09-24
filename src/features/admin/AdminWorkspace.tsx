"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import styles from "./AdminWorkspace.module.css";

type AdminTab = "members" | "projects";
const TABS: readonly AdminTab[] = ["members", "projects"];
const TAB_IDS = { members: "admin-tab-members", projects: "admin-tab-projects" } as const;
const PANEL_IDS = { members: "admin-panel-members", projects: "admin-panel-projects" } as const;

export function AdminWorkspace({
  memberQueue,
  projectQueue,
}: {
  memberQueue: ReactNode;
  projectQueue: ReactNode;
}) {
  const [active, setActive] = useState<AdminTab>("members");
  const refs = useRef<Partial<Record<AdminTab, HTMLButtonElement | null>>>({});

  function selectFromKey(event: KeyboardEvent<HTMLButtonElement>, current: AdminTab) {
    const index = TABS.indexOf(current);
    const next =
      event.key === "ArrowRight"
        ? TABS[(index + 1) % TABS.length]
        : event.key === "ArrowLeft"
          ? TABS[(index - 1 + TABS.length) % TABS.length]
          : event.key === "Home"
            ? TABS[0]
            : event.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (next === null || next === undefined) return;
    event.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  }

  return (
    <Stack gap={12}>
      <div role="tablist" aria-label={messages.admin.metadata.title} className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={(element) => {
              refs.current[tab] = element;
            }}
            id={TAB_IDS[tab]}
            type="button"
            role="tab"
            aria-selected={active === tab}
            aria-controls={PANEL_IDS[tab]}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => setActive(tab)}
            onKeyDown={(event) => selectFromKey(event, tab)}
            className={styles.tab}
          >
            <Text as="span">{messages.admin.tabs[tab]}</Text>
          </button>
        ))}
      </div>
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
