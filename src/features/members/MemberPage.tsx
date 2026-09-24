import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { resolveAccount } from "@/features/account/contracts";
import { getBoardMember, listThreadSummariesByAuthor } from "@/features/board/contracts";
import { ShellPanel } from "@/features/shell";
import { MemberLayerOutlet } from "./MemberLayerContext";
import { MemberView } from "./MemberView";

export type MemberPageProps = {
  params: Promise<{ user: string }>;
};

async function publicMember(user: string) {
  const boardMember = await getBoardMember(user);
  if (boardMember) return boardMember;
  // Registered demo accounts can lead a new project before posting to a
  // fixture board. Their public profile still needs to resolve.
  return resolveAccount(user)?.level === "member" ? { user, role: "member" as const } : null;
}

export async function generateMemberMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { user } = await params;
  const member = await publicMember(user);
  return {
    title: member ? `${member.user} — ${messages.metadata.title}` : messages.members.metadata.title,
    description: messages.members.metadata.description,
  };
}

/** The RSC body shared by the standalone page and an intercepted Board layer. */
export async function MemberBody({ params }: MemberPageProps) {
  const { user } = await params;
  const member = await publicMember(user);
  if (!member) notFound();

  const now = new Date().toISOString();
  const threads = await listThreadSummariesByAuthor(member.user);

  return <MemberView member={member} threads={threads} now={now} />;
}

/** The same profile body mounted into a section's intercepted route slot. */
export async function InterceptedMemberPage(props: MemberPageProps) {
  return (
    <MemberLayerOutlet>
      <MemberBody {...props} />
    </MemberLayerOutlet>
  );
}

/** The public minimum of Members: identity and authored board threads. */
export async function MemberPage({ params }: MemberPageProps) {
  return (
    <ShellPanel title={messages.members.panelTitle} closable>
      <MemberBody params={params} />
    </ShellPanel>
  );
}
