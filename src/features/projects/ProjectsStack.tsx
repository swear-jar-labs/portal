"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import {
  overlayLayerPanels,
  PanelStack,
  ShellPanel,
  stackMemory,
  useOverlayPush,
  useOverlayTop,
} from "@/features/shell";
import {
  PROJECTS_PATH,
  PROJECT_MANAGE_QUERY_KEY,
  PROJECT_PROPOSE_BUTTON_ID,
  PROJECT_PROPOSE_PATH,
  PROJECT_TEAM_MANAGE_BUTTON_ID,
  PROJECT_TEAM_MANAGE_QUERY,
  projectPath,
  projectTabPath,
  projectTeamManagePath,
  type Project,
} from "./projects";
import { ProjectManageRequestProvider } from "./project-manage-request";
import { projectCardId } from "./ProjectsCard";
import { ProjectsFeed } from "./ProjectsFeed";

// The history entry that owns the client-side manage panel: closing it can
// walk back instead of pushing a replacement URL.
const MANAGE_HISTORY_FLAG = "sjProjectManage";

export type ProjectsProjectLayer = {
  slug: Project["slug"];
  title: string;
  // The project's panel body, rendered in RSC (Markdown stays out of the
  // client bundle) and slotted into the panel chrome here.
  layer: ReactNode;
  // The MANAGE TEAM panel body: the direct page's stack opens it from client
  // state, the interceptor renders it as a second panel from the URL query.
  manageLayer: ReactNode;
};

export type ProjectsStackProps = {
  projects: readonly Project[];
  // The ranking base captured by the RSC render: server and client agree at
  // hydration (the feed order itself comes ranked from the page).
  now: string;
  project?: ProjectsProjectLayer;
  // A deep link (?manage=team) starts with the manage panel open.
  initialManage?: boolean;
  proposalLayer?: ReactNode;
};

export function ProjectsStack({
  projects,
  now,
  project,
  initialManage = false,
  proposalLayer,
}: ProjectsStackProps) {
  const router = useRouter();
  const pushOverlay = useOverlayPush();
  // A close owns the navigation until the route changes: a second Esc (or [X])
  // landing in that window must not pop another layer.
  const closingRef = useRef(false);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);
  // The page-owned project opens MANAGE TEAM from client state plus a
  // pushState URL: a router navigation to the same route would match the
  // overlay interceptor and hijack the page's own layer. A project panel that
  // arrives as a store layer (the overlay) keeps the query navigation — the
  // interceptor turns it into the second panel of the same entry.
  const [managing, setManaging] = useState(initialManage);

  // A new top layer (or the feed) ends the close that was in flight.
  useEffect(() => {
    closingRef.current = false;
  }, [overlayLayers, project?.slug, managing, proposalLayer]);

  // The browser history owns the manage URL: back from the manage entry
  // closes the panel, forward reopens it (the URL is the source of truth on
  // every popstate).
  useEffect(() => {
    const onPopState = () => {
      const search = new URLSearchParams(window.location.search);
      setManaging(search.get(PROJECT_MANAGE_QUERY_KEY) === PROJECT_TEAM_MANAGE_QUERY);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // After a direct-load layer pops, focus returns to the control that opened
  // it: the request crosses the page remount in the SPA session memory (the
  // overlay focus return lives in the shared hook).
  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (!id) return;
    const card = document.getElementById(id) ?? document.getElementById(projectCardId(id));
    card?.focus();
    card?.scrollIntoView({ block: "nearest" });
  }, [project?.slug, managing, proposalLayer]);

  const activateProject = useCallback(
    (slug: Project["slug"], event?: MouseEvent<HTMLElement>) => {
      // The root slot intercepts the project above the current stack: the
      // card stays mounted and returns focus when the overlay peels.
      pushOverlay(projectPath(slug), projectCardId(slug))(event);
    },
    [pushOverlay],
  );

  const openProposal = useCallback(() => {
    // The proposal form opens as an overlay layer above the feed; the origin
    // id returns the keyboard to the trigger when the layer peels.
    pushOverlay(PROJECT_PROPOSE_PATH, PROJECT_PROPOSE_BUTTON_ID)();
  }, [pushOverlay]);

  const openManage = useCallback((slug: Project["slug"]) => {
    setManaging(true);
    window.history.pushState(
      { ...window.history.state, [MANAGE_HISTORY_FLAG]: true },
      "",
      projectTeamManagePath(slug),
    );
  }, []);

  const closeProject = useCallback(() => {
    if (!project) return;
    if (closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(project.slug);
    // Direct-load only (an overlay project peels with browser back instead):
    // only the route we pushed has the feed behind it in history; a
    // deep-linked project (or one history walked back to) closes by pushing
    // the feed.
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
    if (!project || !managing || closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(PROJECT_TEAM_MANAGE_BUTTON_ID);
    setManaging(false);
    // history.state is untyped in lib.dom: the marker this stack pushed decides
    // whether the entry can be walked back or must be rewritten in place.
    const historyState = window.history.state as Record<string, unknown> | null;
    if (historyState?.[MANAGE_HISTORY_FLAG] === true) {
      window.history.back();
    } else {
      // A deep link owns the URL: drop the manage query in place.
      window.history.replaceState(window.history.state, "", projectTabPath(project.slug, "team"));
    }
  }, [managing, project]);

  const closeTop = useCallback(() => {
    if (overlayOpen) {
      closeOverlay();
      return;
    }
    if (managing) closeManage();
    else if (proposalLayer) closeProposal();
    else closeProject();
  }, [
    closeManage,
    closeOverlay,
    closeProject,
    closeProposal,
    managing,
    overlayOpen,
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
        // The provider reaches only the page-owned panel: a project panel
        // hosted as a store layer manages through the interceptor instead.
        <ProjectManageRequestProvider requestManage={openManage}>
          <ShellPanel
            title={project.title}
            actions={
              <CloseButton onClose={closeProject} label={messages.shell.window.closeLabel} />
            }
          >
            {project.layer}
          </ShellPanel>
        </ProjectManageRequestProvider>
      ) : null}
      {project && managing ? (
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
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}
