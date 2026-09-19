"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Link, Text } from "@swearjar/dos";
import { isPlainActivation } from "@/lib/activation";
import { memberPath } from "@/shared/members";
import type { ReadroomPerson } from "./readrooms";
import styles from "./readroom.module.css";

export type LeadLinkProps = {
  lead: ReadroomPerson;
};

/** A readroom byline's one target: avatar and user always navigate together.
 * The profile opens as an ordinary standalone route — the intercepted layer
 * over a readroom is a separate task (the board's @member pattern). */
export function LeadLink({ lead }: LeadLinkProps) {
  const router = useRouter();

  function openMember(event?: MouseEvent<HTMLElement>) {
    if (!isPlainActivation(event)) return;
    event?.preventDefault();
    router.push(memberPath(lead.user));
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
      <Link href={memberPath(lead.user)} className={styles.memberLink}>
        <Avatar user={lead.user} src={lead.avatar} size="md" />
        <Text as="span">{lead.user}</Text>
      </Link>
    </span>
  );
}
