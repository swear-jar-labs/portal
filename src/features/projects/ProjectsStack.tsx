"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { useMemberLayer } from "@/features/members/contracts";
import { PanelStack, ShellPanel, stackMemory } from "@/features/shell";
import { PROJECTS_PATH, projectPath, type Project } from "./projects";
import { projectCardId } from "./ProjectsCard";
import { ProjectsFeed } from "./ProjectsFeed";

export type ProjectsProjectLayer = {
  slug: Project["slug"];
  title: string;
  // The project's panel body, rendered in RSC (Markdown stays out of the
  // client bundle) and slotted into the panel chrome here.
  layer: ReactNode;
};

export type ProjectsStackProps = {
  projects: readonly Project[];
  activityBySlug: Readonly<Record<string, string>>;
  // The ranking base captured by the RSC render: server and client agree at
  // hydration (the feed order itself comes ranked from the page).
  now: string;
  project?: ProjectsProjectLayer;
};

export function ProjectsStack({ projects, activityBySlug, now, project }: ProjectsStackProps) {
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
  }, [memberLayerOpen, project?.slug]);

  // After a layer pops, focus returns to the card that opened it: the request
  // crosses the page remount in the SPA session memory.
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (!id) return;
    const card = document.getElementById(projectCardId(id));
    card?.focus();
    card?.scrollIntoView({ block: "nearest" });
  }, [project?.slug]);

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

  const closeProject = useCallback(() => {
    if (!project) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(project.slug);
    // Only the route we pushed has the feed behind it in history; a deep-linked
    // project (or one history walked back to) closes by pushing the feed.
    if (stackMemory.wasPushedFrom(window.location.pathname)) router.back();
    else router.push(PROJECTS_PATH);
  }, [router, project]);

  const closeMember = useCallback(() => {
    if (!memberLayerOpen) return;
    if (closingRef.current) return;
    closingRef.current = true;
    // An intercepted profile is only reached from a plain in-app activation.
    // A fallback preserves the project when an unusual router history omits it.
    if (stackMemory.wasMemberPushedFrom(window.location.pathname)) router.back();
    else router.push(project ? projectPath(project.slug) : PROJECTS_PATH);
  }, [memberLayerOpen, router, project]);

  const closeTop = useCallback(() => {
    if (memberLayerOpen) {
      closeMember();
      return;
    }
    closeProject();
  }, [closeMember, closeProject, memberLayerOpen]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("PROJECTS")} closable>
        <ProjectsFeed
          projects={projects}
          activityBySlug={activityBySlug}
          now={now}
          currentSlug={project?.slug}
          onActivate={activateProject}
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
