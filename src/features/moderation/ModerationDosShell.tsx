"use client";

import { useEffect, useMemo } from "react";
import { DosShell, type DosShellProps } from "@/features/shell";
import { contentReportsFor, sentReportsFor } from "./model";
import { REPORTS_SEED_MAX_AGE, reportsSeedCookieName, resolveReportsAvailable } from "./store";
import { useModeration, useModerationHydrated } from "./useModeration";

/** The section computes file availability; shell only receives a boolean. */
export function ModerationDosShell({
  reportsSeed,
  ...props
}: DosShellProps & { reportsSeed: boolean }) {
  const state = useModeration();
  const user = props.session?.user;
  // The seed stands in only before the store loads; the flag is reactive so
  // a stale seed hides REPORTS again once an empty store finishes loading.
  const storeHydrated = useModerationHydrated();
  const storeHas =
    user !== undefined &&
    (sentReportsFor(state, user).length > 0 || contentReportsFor(state, user).length > 0);
  // Before the store loads, the cookie seed stands in so a reload does not
  // blink the REPORTS file away; a stale seed self-corrects on hydrate.
  const available = resolveReportsAvailable(
    storeHas,
    storeHydrated,
    user !== undefined && reportsSeed,
  );
  useEffect(() => {
    if (user === undefined || !storeHas) return;
    document.cookie = `${reportsSeedCookieName(user)}=1; path=/; max-age=${REPORTS_SEED_MAX_AGE}; samesite=lax`;
  }, [user, storeHas]);
  const commandAvailability = useMemo(() => ({ REPORTS: available }), [available]);
  return <DosShell {...props} commandAvailability={commandAvailability} />;
}
