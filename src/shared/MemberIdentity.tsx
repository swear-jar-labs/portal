"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Avatar } from "@swearjar/dos";
import { avatarFor, memberPath } from "./members";

export type MemberIdentities = Record<
  string,
  { username: string; avatar: string | null | undefined }
>;

const MemberIdentityContext = createContext<MemberIdentities>({});

export function useMemberIdentities(): MemberIdentities {
  return useContext(MemberIdentityContext);
}

export function MemberIdentityProvider({
  identities,
  children,
}: {
  identities: MemberIdentities;
  children: ReactNode;
}) {
  return (
    <MemberIdentityContext.Provider value={identities}>{children}</MemberIdentityContext.Provider>
  );
}

export function useMemberIdentity(person: { user: string; avatar?: string }) {
  const identities = useMemberIdentities();
  const identity = identities[person.user];
  const username = identity?.username ?? person.user;
  const avatar =
    identity?.avatar === null
      ? undefined
      : (identity?.avatar ?? person.avatar ?? avatarFor(person.user));
  return { username, avatar, href: memberPath(username) };
}

export function MemberAvatar({
  person,
  size = "sm",
}: {
  person: { user: string; avatar?: string };
  size?: "sm" | "md" | "lg";
}) {
  const identity = useMemberIdentity(person);
  return <Avatar user={identity.username} src={identity.avatar} size={size} />;
}

export function MemberName({ user }: { user: string }) {
  return useMemberIdentity({ user }).username;
}
