import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { collectActivity } from "../data/activity";
import { listProjects } from "../data/queries";
import { loadProjectProposalLayer } from "../detail/ProjectOverlay";
import { rankProjects } from "../model/projects";
import { ProjectsStack } from "../list/ProjectsStack";

export const projectProposalMetadata: Metadata = {
  title: `${messages.projects.proposal.heading} — ${messages.metadata.title}`,
  description: messages.projects.proposal.metadata.description,
};

export async function ProjectProposalPage() {
  const [proposal, projects] = await Promise.all([loadProjectProposalLayer(), listProjects()]);
  const now = new Date().toISOString();
  const activity = await collectActivity(
    projects.map((project) => project.slug),
    Date.parse(now),
  );
  return (
    <ProjectsStack
      projects={rankProjects(projects, activity, now)}
      now={now}
      proposalLayer={proposal.layer}
    />
  );
}
