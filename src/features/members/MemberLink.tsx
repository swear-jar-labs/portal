"use client";

import { useId, type KeyboardEvent, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Link, Text } from "@swearjar/dos";
import { stackMemory } from "@/features/shell";
import { isPlainActivation } from "@/lib/activation";
import { memberPath } from "@/shared/members";
import styles from "./members.module.css";

// The byline identity every section renders: BoardMember and ReadroomPerson
// both fit (a section role, if any, stays the section's own concern).
export type MemberPerson = {
  user: string;
  avatar?: string;
};

export type MemberLinkProps = {
  person: MemberPerson;
  avatarSize?: "sm" | "md";
  // The section the link lives in: inside it the profile opens as the top
  // layer of the existing stack, elsewhere the link stays an ordinary route.
  sectionPath: string;
};

/** A byline's one target: avatar and user always navigate together. */
export function MemberLink({ person, avatarSize = "md", sectionPath }: MemberLinkProps) {
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();

  function openMember(event?: MouseEvent<HTMLElement>) {
    if (!isPlainActivation(event)) return;
    event?.preventDefault();
    const route = memberPath(person.user);
    if (pathname === sectionPath || pathname.startsWith(`${sectionPath}/`)) {
      stackMemory.rememberMemberPush(route, id);
    }
    router.push(route);
  }

  function activateOnSpace(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== " ") return;
    event.preventDefault();
    openMember();
  }

  // The kit Link stays an RSC leaf: the routed activation lives on this client
  // wrapper and reaches the anchor by bubbling.
  return (
    <span className={styles.memberLinkHost} onClick={openMember} onKeyDown={activateOnSpace}>
      <Link id={id} href={memberPath(person.user)} className={styles.memberLink}>
        <Avatar user={person.user} src={person.avatar} size={avatarSize} />
        <Text as="span">{person.user}</Text>
      </Link>
    </span>
  );
}
