"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ShellSession } from "./DosShell";

// The session the shell was rendered with: the chrome reads its prop directly,
// features read it from here (the board gates votes and authorship by it).
const SessionContext = createContext<ShellSession>(null);

export type SessionProviderProps = {
  session: ShellSession;
  children: ReactNode;
};

export function SessionProvider({ session, children }: SessionProviderProps) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useShellSession(): ShellSession {
  return useContext(SessionContext);
}
