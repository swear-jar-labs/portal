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
import { ShellPanel } from "@/features/shell";
import { AdminQueue } from "./AdminQueue";

export const adminMetadata: Metadata = messages.admin.metadata;

export async function AdminPage() {
  const actor = await getActorSession();
  return (
    <ShellPanel title={fileTitle("ADMIN")} closable>
      {actor?.admin ? (
        <AdminQueue
          items={listMemberApplications(actor).map((application) => ({
            application,
            history: <ApplicationHistory applications={[application]} headingLevel={3} />,
          }))}
          onDecide={mockDecideMemberApplication}
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
