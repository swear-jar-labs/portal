"use client";

import { useId, type KeyboardEvent } from "react";
import { Avatar, Link, Text } from "@swearjar/dos";
import { useOverlayPush } from "@/features/shell";
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
};

/** A byline's one target: avatar and user always navigate together. */
export function MemberLink({ person, avatarSize = "md" }: MemberLinkProps) {
  const id = useId();
  // Every in-app profile opens as an overlay layer above the current stack
  // (the root slot intercepts it); the origin id returns focus on close.
  const openMember = useOverlayPush()(memberPath(person.user), id);

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
