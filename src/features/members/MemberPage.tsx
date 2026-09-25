import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { messages } from "@/content/messages";
import { resolveAccount } from "@/features/account/contracts";
import {
  getBoardMember,
  listThreadSummariesByAuthor,
  type BoardMember,
} from "@/features/board/contracts";
import { OverlayOutlet, ShellPanel } from "@/features/shell";
import { avatarFor } from "@/shared/members";
import { MemberView } from "./MemberView";

export type MemberPageProps = {
  params: Promise<{ user: string }>;
};

async function publicMember(user: string): Promise<BoardMember | null> {
  const boardMember = await getBoardMember(user);
  if (boardMember) return boardMember;
  // Registered demo accounts can lead a new project before posting to a
  // fixture board. Their public profile still needs to resolve.
  return resolveAccount(user)?.level === "member"
    ? { user, role: "member", avatar: avatarFor(user) }
    : null;
}

export async function generateMemberMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { user } = await params;
  const member = await publicMember(user);
  return {
    title: member ? memberDocumentTitle(member.user) : messages.members.metadata.title,
    description: messages.members.metadata.description,
  };
}

/** The member's browser tab title (soft navigation skips slot metadata). */
function memberDocumentTitle(user: string): string {
  return `${user} — ${messages.metadata.title}`;
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

/** The same profile body mounted into the root overlay slot (any section). */
export async function InterceptedMemberPage(props: MemberPageProps) {
  const { user } = await props.params;
  return (
    <OverlayOutlet
      documentTitle={memberDocumentTitle(user)}
      panels={[{ title: messages.members.panelTitle, body: <MemberBody {...props} /> }]}
    />
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
