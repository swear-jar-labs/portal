import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { listRecentThreadSummariesByBoard } from "@/features/board/contracts";
import { collectActivity } from "./activity";
import { getProject, listProjects } from "./data";
import { JOURNAL_PREVIEW_COUNT, rankProjects } from "./projects";
import { ProjectPanel } from "./ProjectPanel";
import { ProjectsStack } from "./ProjectsStack";

export type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateProjectMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return {
    title: project
      ? `${project.name} — ${messages.metadata.title}`
      : messages.projects.metadata.title,
    description: messages.projects.metadata.description,
  };
}

export async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const projects = await listProjects();
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const activityBySlug = await collectActivity(
    projects.map((entry) => entry.slug),
    nowMs,
  );
  const journal = await listRecentThreadSummariesByBoard(
    project.slug,
    JOURNAL_PREVIEW_COUNT,
    nowMs,
  );

  return (
    <ProjectsStack
      projects={rankProjects(projects, activityBySlug, now)}
      activityBySlug={activityBySlug}
      now={now}
      project={{
        slug: project.slug,
        title: project.name,
        layer: <ProjectPanel project={project} journal={journal} now={now} />,
      }}
    />
  );
}
