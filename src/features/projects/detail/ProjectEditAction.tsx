"use client";

import { useRouter } from "next/navigation";
import { Button, Stack } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { stackMemory, useShellSession } from "@/features/shell";
import { useProjectManageRequest } from "../data/project-manage-request";
import { PROJECT_EDIT_BUTTON_ID, projectEditPath, type Project } from "../model/projects";
import styles from "../projects.module.css";

export function ProjectEditAction({ project }: { project: Project }) {
  const session = useShellSession();
  const requestManage = useProjectManageRequest();
  const router = useRouter();
  const allowed =
    session !== null &&
    (session.admin ||
      project.lead?.user === session.user ||
      project.maintainers.some((person) => person.user === session.user));
  if (!allowed) return null;
  return (
    <Stack direction="row" navRow className={styles.projectHeaderAction}>
      <Button
        id={PROJECT_EDIT_BUTTON_ID}
        onClick={() => {
          if (requestManage) requestManage(project.slug, "edit");
          else {
            const route = projectEditPath(project.slug);
            stackMemory.rememberPush(route);
            router.push(route);
          }
        }}
      >
        {messages.projects.edit.open}
      </Button>
    </Stack>
  );
}
