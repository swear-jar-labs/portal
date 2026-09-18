"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DialogState } from "./useCommandRunner";

// The shell owns the modal layer; features ask for a dialog through this API
// instead of mounting one of their own (the board's delete confirmation, the
// guest login prompt).
export type ShellDialogs = {
  open: (dialog: DialogState) => void;
  close: () => void;
  requestLogin: () => void;
};

const ShellDialogsContext = createContext<ShellDialogs | null>(null);

export type ShellDialogsProviderProps = {
  dialogs: ShellDialogs;
  children: ReactNode;
};

export function ShellDialogsProvider({ dialogs, children }: ShellDialogsProviderProps) {
  return <ShellDialogsContext.Provider value={dialogs}>{children}</ShellDialogsContext.Provider>;
}

export function useShellDialogs(): ShellDialogs {
  const dialogs = useContext(ShellDialogsContext);
  if (dialogs === null) throw new Error("useShellDialogs must be used inside the shell");
  return dialogs;
}

/** The guest gate: any action that needs a member funnels into this prompt. */
export function useLoginPrompt(): () => void {
  return useShellDialogs().requestLogin;
}
