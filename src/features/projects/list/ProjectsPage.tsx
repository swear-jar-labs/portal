import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { listProjects } from "../data/queries";
import { collectActivity } from "../data/activity";
import { rankProjects } from "../model/projects";
import { ProjectsStack } from "./ProjectsStack";

export const projectsMetadata: Metadata = messages.projects.metadata;

export async function ProjectsPage() {
  const projects = await listProjects();
  const now = new Date().toISOString();
  const activityBySlug = await collectActivity(
    projects.map((project) => project.slug),
    Date.parse(now),
  );

  // The index reads no search params: the stack renders without a Suspense
  // boundary (like the readroom's feed, unlike the board's filtered one).
  return <ProjectsStack projects={rankProjects(projects, activityBySlug, now)} now={now} />;
}
