"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

const SearchAvailabilityContext = createContext<((available: boolean) => void) | null>(null);

export function SearchAvailabilityProvider({
  onChange,
  children,
}: {
  onChange: (available: boolean) => void;
  children: ReactNode;
}) {
  return (
    <SearchAvailabilityContext.Provider value={onChange}>
      {children}
    </SearchAvailabilityContext.Provider>
  );
}

// Only the base section stack publishes. Overlay/fallback stacks pass null,
// so they never overwrite the base stack's visibility or own another target.
export function usePublishSearchAvailability(available: boolean | null): void {
  const publish = useContext(SearchAvailabilityContext);
  useEffect(() => {
    if (available === null || publish === null) return;
    publish(available);
    return () => publish(false);
  }, [available, publish]);
}
