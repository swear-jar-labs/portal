"use client";

import { useId, type KeyboardEvent, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Link, Text } from "@swearjar/dos";
import { stackMemory } from "@/features/shell";
import { isPlainActivation } from "@/lib/activation";
import { memberPath } from "@/shared/members";
import { FEED_PATH } from "./threads";
import type { BoardMember } from "./threads";
import styles from "./board.module.css";

export type MemberLinkProps = {
  member: BoardMember;
};

/** A board byline's one target: avatar and user always navigate together. */
export function MemberLink({ member }: MemberLinkProps) {
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();

  function openMember(event?: MouseEvent<HTMLElement>) {
    if (!isPlainActivation(event)) return;
    event?.preventDefault();
    const route = memberPath(member.user);
    // The Board's shared layout intercepts profiles above either a feed or a
    // routed thread. Other profile links stay ordinary standalone routes.
    if (pathname === FEED_PATH || pathname.startsWith(`${FEED_PATH}/`)) {
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
      <Link id={id} href={memberPath(member.user)} className={styles.memberLink}>
        <Avatar user={member.user} src={member.avatar} size="md" />
        <Text as="span">{member.user}</Text>
      </Link>
    </span>
  );
}
