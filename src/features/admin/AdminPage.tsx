import type { Metadata } from "next";
import { Heading, Stack, Text } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import {
  ApplicationHistory,
  getActorSession,
  listMemberApplications,
  mockDecideMemberApplication,
} from "@/features/account/contracts";
import { listProjectSubmissions, listProjects } from "@/features/projects/contracts";
import { ProjectAdminQueue } from "./AdminProjectQueue";
import { AdminProjectTeams } from "./AdminProjectTeams";
import { ShellPanel } from "@/features/shell";
import { AdminQueue } from "./AdminQueue";
import { AdminWorkspace } from "./AdminWorkspace";
import { mockDecideProject } from "./mock-project-actions";

export const adminMetadata: Metadata = messages.admin.metadata;

export async function AdminPage() {
  const actor = await getActorSession();
  const projects = actor?.admin ? await listProjects() : [];
  return (
    <ShellPanel title={fileTitle("ADMIN")} closable>
      {actor?.admin ? (
        <AdminWorkspace
          memberQueue={
            <AdminQueue
              items={listMemberApplications(actor).map((application) => ({
                application,
                history: <ApplicationHistory applications={[application]} headingLevel={3} />,
              }))}
              onDecide={mockDecideMemberApplication}
            />
          }
          projectQueue={
            <ProjectAdminQueue
              submissions={listProjectSubmissions(actor)}
              onDecide={mockDecideProject}
            />
          }
          teamQueue={<AdminProjectTeams projects={projects} />}
        />
      ) : (
        <Stack gap={8}>
          <Heading level={1}>{messages.admin.heading}</Heading>
          <Text role="danger">{messages.admin.denied}</Text>
        </Stack>
      )}
    </ShellPanel>
  );
}
