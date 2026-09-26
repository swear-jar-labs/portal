import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { getActorSession, listMemberUsers } from "@/features/account/contracts";
import { countThreadsByBoard, listRecentThreadSummariesByBoard } from "@/features/board/contracts";
import { listTicketsByProject } from "@/features/tickets/contracts";
import { OverlayOutlet, type WithDocumentTitle } from "@/features/shell";
import { getProject } from "../data/queries";
import { projectSubmissionsFor } from "../data/mock-submissions";
import {
  JOURNAL_PREVIEW_COUNT,
  PROJECT_MANAGE_QUERY_KEY,
  PROJECT_TAB_QUERY,
  PROJECT_TEAM_MANAGE_QUERY,
  projectDocumentTitle,
  projectTabs,
  type ProjectTab,
} from "../model/projects";
import { projectTeams } from "../data/team-store";
import { ProjectPanel } from "./ProjectPanel";
import { ProjectProposalForm } from "../proposal/ProjectProposalForm";
import { ProjectTeamManage } from "./ProjectTeamManage";
import type { ProjectPageProps } from "./ProjectPage";
import type { ProjectsProjectLayer } from "../list/ProjectsStack";

const PROJECT_TICKET_UPDATE_COUNT = 5;

type ProjectOverlayQuery = Awaited<ProjectPageProps["searchParams"]>;

function activeTabFromQuery(query: ProjectOverlayQuery): ProjectTab {
  if (query[PROJECT_MANAGE_QUERY_KEY] === PROJECT_TEAM_MANAGE_QUERY) return "team";
  return projectTabs.find((tab) => tab === query[PROJECT_TAB_QUERY]) ?? "project";
}

export type LoadProjectOverlayOptions = {
  slug: string;
  searchParams: ProjectOverlayQuery;
  now: string;
};

export type ProjectLayerData = WithDocumentTitle<ProjectsProjectLayer>;

/**
 * The shared project panel builder: the direct-load page and the overlay
 * interceptor build the same panels from the same detail data (no markup
 * duplication). The feed list stays the page's own concern.
 */
export async function loadProjectOverlay({
  slug,
  searchParams,
  now,
}: LoadProjectOverlayOptions): Promise<ProjectLayerData> {
  const activeTab = activeTabFromQuery(searchParams);
  const project = await getProject(slug);
  if (!project) notFound();
  const team = projectTeams.view(project);
  const nowMs = Date.parse(now);
  const [journal, tickets, threadCount] = await Promise.all([
    listRecentThreadSummariesByBoard(project.slug, JOURNAL_PREVIEW_COUNT, nowMs),
    listTicketsByProject(project.slug),
    countThreadsByBoard(project.slug),
  ]);

  /** The manage panel always ships: the direct page's stack opens it from
   * client state, the interceptor renders it only when the URL asks. */
  return {
    slug: project.slug,
    title: project.name,
    documentTitle: projectDocumentTitle(project.name),
    layer: (
      <ProjectPanel
        project={project}
        activeTab={activeTab}
        team={team}
        journal={journal}
        tickets={tickets.slice(0, PROJECT_TICKET_UPDATE_COUNT)}
        ticketCount={tickets.length}
        threadCount={threadCount}
        now={now}
      />
    ),
    manageLayer: (
      <ProjectTeamManage project={project} team={team} memberUsers={listMemberUsers()} />
    ),
  };
}

/** The same project panels mounted into the root overlay slot (any section). */
export async function InterceptedProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const overlay = await loadProjectOverlay({
    slug,
    searchParams: query,
    now: new Date().toISOString(),
  });
  return (
    <OverlayOutlet
      documentTitle={overlay.documentTitle}
      panels={[
        { title: overlay.title, body: overlay.layer },
        ...(query[PROJECT_MANAGE_QUERY_KEY] === PROJECT_TEAM_MANAGE_QUERY
          ? [{ title: messages.projects.team.manageHeading, body: overlay.manageLayer }]
          : []),
      ]}
    />
  );
}

export type ProjectProposalLayerData = {
  title: string;
  documentTitle: string;
  layer: React.ReactNode;
};

/**
 * The shared proposal-form builder: the direct-load page mounts it as the
 * ProjectsStack's own layer, the static interceptor registers it as a store
 * layer (so /projects/propose keeps the feed behind it, like every other
 * project route).
 */
export async function loadProjectProposalLayer(): Promise<ProjectProposalLayerData> {
  const actor = await getActorSession();
  return {
    title: messages.projects.proposal.heading,
    documentTitle: `${messages.projects.proposal.heading} — ${messages.metadata.title}`,
    layer: (
      <ProjectProposalForm
        level={actor?.level ?? "guest"}
        submissions={actor ? projectSubmissionsFor(actor.user) : []}
      />
    ),
  };
}

/** The proposal form mounted into the root overlay slot above the feed. */
export async function InterceptedProjectProposalPage() {
  const proposal = await loadProjectProposalLayer();
  return (
    <OverlayOutlet
      documentTitle={proposal.documentTitle}
      panels={[{ title: proposal.title, body: proposal.layer }]}
    />
  );
}
