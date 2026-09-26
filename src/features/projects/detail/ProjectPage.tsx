import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { collectActivity } from "../data/activity";
import { getProject, listProjects } from "../data/queries";
import {
  rankProjects,
  projectDocumentTitle,
  PROJECT_MANAGE_QUERY_KEY,
  PROJECT_TEAM_MANAGE_QUERY,
} from "../model/projects";
import { loadProjectOverlay } from "./ProjectOverlay";
import { ProjectsStack } from "../list/ProjectsStack";

export type ProjectPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateProjectMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return {
    title: project ? projectDocumentTitle(project.name) : messages.projects.metadata.title,
    description: messages.projects.metadata.description,
  };
}

export async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const now = new Date().toISOString();
  const overlay = await loadProjectOverlay({ slug, searchParams: query, now });
  // The feed list is the page's own concern; the panels come from the shared
  // overlay builder so direct load and the interceptor never drift (a missing
  // project already 404s inside the builder).

  const projects = await listProjects();
  const nowMs = Date.parse(now);
  const activityBySlug = await collectActivity(
    projects.map((entry) => entry.slug),
    nowMs,
  );

  return (
    <ProjectsStack
      projects={rankProjects(projects, activityBySlug, now)}
      now={now}
      project={overlay}
      initialManage={query[PROJECT_MANAGE_QUERY_KEY] === PROJECT_TEAM_MANAGE_QUERY}
    />
  );
}
