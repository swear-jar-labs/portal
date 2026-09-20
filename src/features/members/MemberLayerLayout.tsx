import type { ReactNode } from "react";
import { MemberLayerProvider } from "./MemberLayerContext";

export type MemberLayerLayoutProps = {
  children: ReactNode;
  member: ReactNode;
};

/** Keeps the active section page mounted while the member parallel route changes. */
export function MemberLayerLayout({ children, member }: MemberLayerLayoutProps) {
  return (
    <MemberLayerProvider>
      {children}
      {member}
    </MemberLayerProvider>
  );
}
