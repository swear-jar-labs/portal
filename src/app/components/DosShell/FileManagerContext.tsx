"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { useFileManager } from "./useFileManager";

export type FileManagerState = ReturnType<typeof useFileManager>;

const FileManagerContext = createContext<FileManagerState | null>(null);

export type FileManagerProviderProps = {
  value: FileManagerState;
  children: ReactNode;
};

export function FileManagerProvider({ value, children }: FileManagerProviderProps) {
  return <FileManagerContext.Provider value={value}>{children}</FileManagerContext.Provider>;
}

export function useFileManagerState(): FileManagerState {
  const state = useContext(FileManagerContext);
  if (!state) throw new Error("useFileManagerState must be used within DosShell");
  return state;
}
