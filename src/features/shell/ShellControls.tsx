"use client";

import { createContext, useContext, type ReactNode } from "react";

// The shell's controls are live when no dialog or screensaver owns the screen.
// The frame's own keyboard listeners (the panel stack) mute themselves with it;
// they cannot see the dialog state directly.
const ShellControlsContext = createContext(false);

export type ShellControlsProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

export function ShellControlsProvider({ enabled, children }: ShellControlsProviderProps) {
  return <ShellControlsContext.Provider value={enabled}>{children}</ShellControlsContext.Provider>;
}

export function useShellControls(): boolean {
  return useContext(ShellControlsContext);
}
