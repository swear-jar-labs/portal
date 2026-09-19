"use client";

import { useId, type KeyboardEvent, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Link, Text } from "@swearjar/dos";
import { stackMemory } from "@/features/shell";
import { isPlainActivation } from "@/lib/activation";
import { memberPath } from "@/shared/members";
import { READROOM_PATH, type ReadroomPerson } from "./readrooms";
import styles from "./readroom.module.css";

export type ReadroomMemberLinkProps = {
  person: ReadroomPerson;
  avatarSize?: "sm" | "md";
};

/** A readroom byline's one target: avatar and user always navigate together.
 * Inside the readroom the profile opens as the top layer of the existing stack
 * (the route is remembered for back-close and focus return); elsewhere the
 * link stays an ordinary standalone route. */
export function ReadroomMemberLink({ person, avatarSize = "md" }: ReadroomMemberLinkProps) {
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();

  function openMember(event?: MouseEvent<HTMLElement>) {
    if (!isPlainActivation(event)) return;
    event?.preventDefault();
    const route = memberPath(person.user);
    // The Readroom's layout intercepts profiles above either the feed or a
    // routed task. Other profile links stay ordinary standalone routes.
    if (pathname === READROOM_PATH || pathname.startsWith(`${READROOM_PATH}/`)) {
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
