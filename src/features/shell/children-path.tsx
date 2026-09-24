"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";

// The children slot's current path, published by the root layout: a parallel
// slot page cannot read its sibling's segments itself, but a client component
// rendered at the layout level can. OverlayOutlet uses it to tell an
// interception (children show the base route) from a query-only navigation on
// a direct page (children show the same pathname), where registering would
// duplicate the page's own layer.
const ChildrenPathContext = createContext<string | null>(null);

export function ChildrenPathProvider({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const path = `/${segments.join("/")}` || "/";
  return <ChildrenPathContext.Provider value={path}>{children}</ChildrenPathContext.Provider>;
}

/** Null outside the provider (unit renders and slot pages have no layout). */
export function useChildrenPath(): string | null {
  return useContext(ChildrenPathContext);
}
