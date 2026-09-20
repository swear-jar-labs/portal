import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { countThreadsByBoard, listRecentThreadSummariesByBoard } from "@/features/board/contracts";
import { listTicketsByProject } from "@/features/tickets/contracts";
import { collectActivity } from "./activity";
import { getProject, listProjects } from "./data";
import { JOURNAL_PREVIEW_COUNT, rankProjects } from "./projects";
import { ProjectPanel } from "./ProjectPanel";
import { ProjectsStack } from "./ProjectsStack";

export type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

const PROJECT_TICKET_UPDATE_COUNT = 5;

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
  const [journal, tickets, threadCount] = await Promise.all([
    listRecentThreadSummariesByBoard(project.slug, JOURNAL_PREVIEW_COUNT, nowMs),
    listTicketsByProject(project.slug),
    countThreadsByBoard(project.slug),
  ]);

  return (
    <ProjectsStack
      projects={rankProjects(projects, activityBySlug, now)}
      now={now}
      project={{
        slug: project.slug,
        title: project.name,
        layer: (
          <ProjectPanel
            project={project}
            journal={journal}
            tickets={tickets.slice(0, PROJECT_TICKET_UPDATE_COUNT)}
            ticketCount={tickets.length}
            threadCount={threadCount}
            now={now}
          />
        ),
      }}
    />
  );
}
