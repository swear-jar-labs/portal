"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Who opens the MANAGE TEAM panel: the project page's section stack renders
 * it as its own layer and keeps the URL in sync with pushState (a router
 * navigation to the same route would match the overlay interceptor and
 * hijack the direct page). A project panel hosted by another section's stack
 * (a project overlay over the tickets feed) falls back to the ordinary
 * intercepted query navigation.
 */
export type ProjectManageRequest = (slug: string) => void;

const ProjectManageRequestContext = createContext<ProjectManageRequest | null>(null);

export function ProjectManageRequestProvider({
  requestManage,
  children,
}: {
  requestManage: ProjectManageRequest;
  children: ReactNode;
}) {
  return (
    <ProjectManageRequestContext.Provider value={requestManage}>
      {children}
    </ProjectManageRequestContext.Provider>
  );
}

export function useProjectManageRequest(): ProjectManageRequest | null {
  return useContext(ProjectManageRequestContext);
}
