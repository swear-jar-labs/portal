import type { Project } from "./projects";

// The shared server-process registry. LOGOFF and reload preserve proposals and
// approved projects; a dev-server restart clears them with demo accounts.
const approved = new Map<string, Project>();

export function approvedProject(slug: string): Project | null {
  return approved.get(slug) ?? null;
}

export function approvedProjects(): Project[] {
  return [...approved.values()];
}

export function registerApprovedProject(project: Project): boolean {
  if (approved.has(project.slug)) return false;
  approved.set(project.slug, project);
  return true;
}

export function resetApprovedProjects(): void {
  approved.clear();
}
