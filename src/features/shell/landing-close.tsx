"use client";

import { createContext, useContext, type ReactNode } from "react";

// The shell owns the landing window layer; the landing slice closes itself
// through this hook instead of reaching into shell state.
const LandingCloseContext = createContext<(() => void) | null>(null);

export function LandingCloseProvider({
  close,
  children,
}: {
  close: () => void;
  children: ReactNode;
}) {
  return <LandingCloseContext.Provider value={close}>{children}</LandingCloseContext.Provider>;
}

export function useCloseLanding(): () => void {
  const close = useContext(LandingCloseContext);
  if (!close) throw new Error("useCloseLanding must be used inside the landing window");
  return close;
}
