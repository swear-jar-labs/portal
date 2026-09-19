import type { ReactNode } from "react";
import { MemberLayerProvider } from "./MemberLayerContext";

export type DiscussionsLayoutProps = {
  children: ReactNode;
  member: ReactNode;
};

/** Keeps the active Board page mounted while the member parallel route changes. */
export function DiscussionsLayout({ children, member }: DiscussionsLayoutProps) {
  return (
    <MemberLayerProvider>
      {children}
      {member}
    </MemberLayerProvider>
  );
}
