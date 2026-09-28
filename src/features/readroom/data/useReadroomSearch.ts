"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { targetKey, useModeration } from "@/features/moderation/contracts";
import { READROOM_PATH, type Readroom } from "../model/readrooms";
import {
  filterReadroomTags,
  parseReadroomQuery,
  readroomQueryParams,
  sameReadroomQuery,
  searchReadrooms,
  searchTerms,
  type ReadroomQuery,
} from "../model/search";

type Viewer = { user: string; admin: boolean } | null;

/** The feed's live search: URL state, action-time clock and the visible session
 * corpus. No indexed copy survives an actor or moderation change. */
export function useReadroomSearch(readrooms: readonly Readroom[], now: string, viewer: Viewer) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const moderation = useModeration();
  const [query, setQuery] = useState<ReadroomQuery>(() => parseReadroomQuery(searchParams));
  const [syncedSearch, setSyncedSearch] = useState(() => searchParams.toString());
  const liveSearch = searchParams.toString();
  if (syncedSearch !== liveSearch) {
    setSyncedSearch(liveSearch);
    const next = parseReadroomQuery(searchParams);
    if (!sameReadroomQuery(query, next)) setQuery(next);
  }
  const [clock, setClock] = useState(now);

  // Refresh the static page's build-time stamp once after hydration. Later
  // updates come from search controls; an idle page does not watch deadlines.
  useEffect(() => {
    const timer = window.setTimeout(() => setClock(new Date().toISOString()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function changeQuery(patch: Partial<ReadroomQuery>) {
    setClock(new Date().toISOString());
    setQuery((current) => ({ ...current, ...patch }));
  }

  // Rewrite only the feed URL. Next's search-params subscription picks up
  // browser back/forward after a result opens; edits follow the forum's URL
  // pattern and do not refetch the fixture page.
  useEffect(() => {
    if (pathname !== READROOM_PATH) return;
    const search = readroomQueryParams(query).toString();
    window.history.replaceState(
      window.history.state,
      "",
      search ? `${READROOM_PATH}?${search}` : READROOM_PATH,
    );
  }, [pathname, query]);

  const hiddenNoteIds = new Set<string>();
  const revisionBodies = new Map<string, string>();
  for (const report of moderation.reports) {
    if (report.target.kind !== "note") continue;
    const key = targetKey(report.target);
    if (
      moderation.unavailable.has(key) ||
      (moderation.hidden[key] && !viewer?.admin && report.target.author !== viewer?.user)
    )
      hiddenNoteIds.add(report.target.id);
    if (report.currentRevision > 1 && report.currentBody !== undefined)
      revisionBodies.set(report.target.id, report.currentBody);
  }
  const filtered = filterReadroomTags(readrooms, query.tags);
  const hits = searchReadrooms(filtered, query.q, clock, { hiddenNoteIds, revisionBodies });
  const hitIds = new Set(hits.map((hit) => hit.taskId));
  const feedReadrooms =
    searchTerms(query.q).length === 0 ? filtered : filtered.filter((entry) => hitIds.has(entry.id));

  return { query, changeQuery, clock, hits, feedReadrooms };
}
