// The jar's model: pure helpers over bad-command events. The window is a
// sliding 24 hours, not a midnight reset: the day boundary (and its timezone)
// is a backend question for Phase 5 (jar_events in NEXT-STEPS.md §8).

const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const HOURS_PER_WINDOW = 24;

/** The sliding stats window shared by the shell and the jar row leaves. */
export const JAR_WINDOW_MS = HOURS_PER_WINDOW * SECONDS_PER_HOUR * MS_PER_SECOND;

/** How many top misses the dialog names. */
export const JAR_TOP_COMMANDS = 3;

export type JarEvent = {
  /** Client timestamp of the miss. */
  at: number;
  /** The raw command line as typed. */
  raw: string;
};

export function isRecentEvent(event: JarEvent, now: number = Date.now()): boolean {
  return now - event.at < JAR_WINDOW_MS;
}

/** Bad commands inside the window, oldest first. */
export function recentEvents(events: readonly JarEvent[], now: number = Date.now()): JarEvent[] {
  return events.filter((event) => isRecentEvent(event, now));
}

export type TopMiss = { raw: string; count: number; lastAt: number };

/** The most frequent misses of the window: count first, freshness breaks ties. */
export function topBadCommands(
  events: readonly JarEvent[],
  now: number = Date.now(),
  limit: number = JAR_TOP_COMMANDS,
): TopMiss[] {
  const byCommand = new Map<string, TopMiss>();
  for (const event of recentEvents(events, now)) {
    const raw = event.raw.trim().toUpperCase();
    if (raw === "") continue;
    const seen = byCommand.get(raw);
    if (seen) {
      seen.count += 1;
      seen.lastAt = Math.max(seen.lastAt, event.at);
    } else {
      byCommand.set(raw, { raw, count: 1, lastAt: event.at });
    }
  }
  return [...byCommand.values()]
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt || (a.raw < b.raw ? -1 : 1))
    .slice(0, Math.max(0, limit));
}
