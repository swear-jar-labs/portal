import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import {
  getBoardMember,
  listThreadSummariesByAuthor,
  MemberLayerOutlet,
} from "@/features/board/contracts";
import { ShellPanel } from "@/features/shell";
import { MemberView } from "./MemberView";

export type MemberPageProps = {
  params: Promise<{ user: string }>;
};

export async function generateMemberMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { user } = await params;
  const member = await getBoardMember(user);
  return {
    title: member ? `${member.user} — ${messages.metadata.title}` : messages.members.metadata.title,
    description: messages.members.metadata.description,
  };
}

/** The RSC body shared by the standalone page and an intercepted Board layer. */
export async function MemberBody({ params }: MemberPageProps) {
  const { user } = await params;
  const member = await getBoardMember(user);
  if (!member) notFound();

  const now = new Date().toISOString();
  const threads = await listThreadSummariesByAuthor(member.user);

  return <MemberView member={member} threads={threads} now={now} />;
}

/** The same profile body mounted into the Board's intercepted route slot. */
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
