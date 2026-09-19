import type { ReactNode } from "react";
import { ReadroomLayerProvider } from "./ReadroomLayerContext";

export type ReadroomLayoutProps = {
  children: ReactNode;
  member: ReactNode;
};

/** Keeps the active Readroom page mounted while the member parallel route changes. */
export function ReadroomLayout({ children, member }: ReadroomLayoutProps) {
  return (
    <ReadroomLayerProvider>
      {children}
      {member}
    </ReadroomLayerProvider>
  );
}
