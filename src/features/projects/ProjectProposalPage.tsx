import type { Metadata } from "next";
import { messages } from "@/content/messages";
import { getActorSession } from "@/features/account/contracts";
import { collectActivity } from "./activity";
import { listProjects } from "./data";
import { projectSubmissionsFor } from "./mock-submissions";
import { ProjectProposalForm } from "./ProjectProposalForm";
import { rankProjects } from "./projects";
import { ProjectsStack } from "./ProjectsStack";

export const projectProposalMetadata: Metadata = {
  title: `${messages.projects.proposal.heading} — ${messages.metadata.title}`,
  description: messages.projects.metadata.description,
};

export async function ProjectProposalPage() {
  const [actor, projects] = await Promise.all([getActorSession(), listProjects()]);
  const now = new Date().toISOString();
  const activity = await collectActivity(
    projects.map((project) => project.slug),
    Date.parse(now),
  );
  return (
    <ProjectsStack
      projects={rankProjects(projects, activity, now)}
      now={now}
      proposalLayer={
        <ProjectProposalForm
          level={actor?.level ?? "guest"}
          submissions={actor ? projectSubmissionsFor(actor.user) : []}
        />
      }
    />
  );
}
