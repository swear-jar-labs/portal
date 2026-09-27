"use client";

import { createContext, useContext, type ReactNode } from "react";

type OpenPreview = (reportId: string, originId: string) => void;
const PreviewContext = createContext<OpenPreview | null>(null);

export function ModerationPreviewProvider({
  open,
  children,
}: {
  open: OpenPreview;
  children: ReactNode;
}) {
  return <PreviewContext.Provider value={open}>{children}</PreviewContext.Provider>;
}

export function useModerationPreview(): OpenPreview {
  const open = useContext(PreviewContext);
  if (!open) throw new Error("Moderation preview requires its admin stack");
  return open;
}
