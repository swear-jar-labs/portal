"use client";

import { useMemo } from "react";
import { DosShell, type DosShellProps } from "@/features/shell";
import { contentReportsFor, sentReportsFor } from "./model";
import { useModeration } from "./useModeration";

/** The section computes file availability; shell only receives a boolean. */
export function ModerationDosShell(props: DosShellProps) {
  const state = useModeration();
  const user = props.session?.user;
  const hasReports =
    user !== undefined &&
    (sentReportsFor(state, user).length > 0 || contentReportsFor(state, user).length > 0);
  const commandAvailability = useMemo(() => ({ REPORTS: hasReports }), [hasReports]);
  return <DosShell {...props} commandAvailability={commandAvailability} />;
}
