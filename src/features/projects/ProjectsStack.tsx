"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { useMemberLayer } from "@/features/members/contracts";
import { PanelStack, ShellPanel, stackMemory } from "@/features/shell";
import {
  PROJECTS_PATH,
  PROJECT_PROPOSE_BUTTON_ID,
  PROJECT_PROPOSE_PATH,
  PROJECT_TEAM_MANAGE_BUTTON_ID,
  projectPath,
  projectTeamManagePath,
  projectTabPath,
  type Project,
} from "./projects";
import { projectCardId } from "./ProjectsCard";
import { ProjectsFeed } from "./ProjectsFeed";

export type ProjectsProjectLayer = {
  slug: Project["slug"];
  title: string;
  // The project's panel body, rendered in RSC (Markdown stays out of the
  // client bundle) and slotted into the panel chrome here.
  layer: ReactNode;
  manageLayer?: ReactNode;
};

export type ProjectsStackProps = {
  projects: readonly Project[];
  // The ranking base captured by the RSC render: server and client agree at
  // hydration (the feed order itself comes ranked from the page).
  now: string;
  project?: ProjectsProjectLayer;
  proposalLayer?: ReactNode;
};

export function ProjectsStack({ projects, now, project, proposalLayer }: ProjectsStackProps) {
  const router = useRouter();
  const routedMemberLayer = useMemberLayer();
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  const memberLayerOpen = routedMemberLayer !== null;
  const wasMemberLayerOpen = useRef(memberLayerOpen);

  // A new top layer (or the feed) ends the close that was in flight.
  useEffect(() => {
    closingRef.current = false;
  }, [memberLayerOpen, project?.slug, project?.manageLayer, proposalLayer]);

  // After a layer pops, focus returns to the card that opened it: the request
  // crosses the page remount in the SPA session memory.
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (!id) return;
    const card = document.getElementById(id) ?? document.getElementById(projectCardId(id));
    card?.focus();
    card?.scrollIntoView({ block: "nearest" });
  }, [project?.slug, project?.manageLayer, proposalLayer]);

  // Unlike a project route, an intercepted profile keeps this ProjectsStack
  // and its author link mounted. The known id can therefore receive focus as
  // soon as the profile slot disappears.
  useEffect(() => {
    const closed = !memberLayerOpen && wasMemberLayerOpen.current;
    wasMemberLayerOpen.current = memberLayerOpen;
    if (!closed) return;
    const id = stackMemory.takePendingMemberFocus();
    if (id) document.getElementById(id)?.focus();
  }, [memberLayerOpen]);

  const activateProject = useCallback(
    (slug: Project["slug"], event?: MouseEvent<HTMLElement>) => {
      if (!isPlainActivation(event)) return;
      event?.preventDefault();
      const route = projectPath(slug);
      stackMemory.rememberPush(route);
      router.push(route);
    },
    [router],
  );

  const openProposal = useCallback(() => {
    stackMemory.rememberPush(PROJECT_PROPOSE_PATH);
    router.push(PROJECT_PROPOSE_PATH);
  }, [router]);

  const closeProject = useCallback(() => {
    if (!project) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(project.slug);
    // Only the route we pushed has the feed behind it in history; a deep-linked
    // project (or one history walked back to) closes by pushing the feed.
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else router.push(PROJECTS_PATH);
  }, [router, project]);

  const closeProposal = useCallback(() => {
    if (!proposalLayer || closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(PROJECT_PROPOSE_BUTTON_ID);
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else router.push(PROJECTS_PATH);
  }, [proposalLayer, router]);

  const closeManage = useCallback(() => {
    if (!project?.manageLayer || closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(PROJECT_TEAM_MANAGE_BUTTON_ID);
    const route = `${window.location.pathname}${window.location.search}`;
    if (stackMemory.takePushedFrom(route)) router.back();
    else router.push(projectTabPath(project.slug, "team"));
  }, [project, router]);

  const closeMember = useCallback(() => {
    if (!memberLayerOpen) return;
    if (closingRef.current) return;
    closingRef.current = true;
    // An intercepted profile is only reached from a plain in-app activation.
    // A fallback preserves the project when an unusual router history omits it.
    if (stackMemory.wasMemberPushedFrom(window.location.pathname)) router.back();
    else
      router.push(
        project?.manageLayer
          ? projectTeamManagePath(project.slug)
          : project
            ? projectPath(project.slug)
            : proposalLayer
              ? PROJECT_PROPOSE_PATH
              : PROJECTS_PATH,
      );
  }, [memberLayerOpen, router, project, proposalLayer]);

  const closeTop = useCallback(() => {
    if (memberLayerOpen) {
      closeMember();
      return;
    }
    if (project?.manageLayer) closeManage();
    else if (proposalLayer) closeProposal();
    else closeProject();
  }, [
    closeManage,
    closeMember,
    closeProject,
    closeProposal,
    memberLayerOpen,
    project?.manageLayer,
    proposalLayer,
  ]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("PROJECTS")} closable>
        <ProjectsFeed
          projects={projects}
          now={now}
          currentSlug={project?.slug}
          onActivate={activateProject}
          onPropose={openProposal}
        />
      </ShellPanel>
      {project ? (
        <ShellPanel
          title={project.title}
          actions={<CloseButton onClose={closeProject} label={messages.shell.window.closeLabel} />}
        >
          {project.layer}
        </ShellPanel>
      ) : null}
      {project?.manageLayer ? (
        <ShellPanel
          title={messages.projects.team.manageHeading}
          actions={<CloseButton onClose={closeManage} label={messages.shell.window.closeLabel} />}
        >
          {project.manageLayer}
        </ShellPanel>
      ) : null}
      {proposalLayer ? (
        <ShellPanel
          title={messages.projects.proposal.heading}
          actions={<CloseButton onClose={closeProposal} label={messages.shell.window.closeLabel} />}
        >
          {proposalLayer}
        </ShellPanel>
      ) : null}
      {memberLayerOpen ? (
        <ShellPanel
          title={messages.members.panelTitle}
          actions={<CloseButton onClose={closeMember} label={messages.shell.window.closeLabel} />}
        >
          {routedMemberLayer}
        </ShellPanel>
      ) : null}
    </PanelStack>
  );
}
